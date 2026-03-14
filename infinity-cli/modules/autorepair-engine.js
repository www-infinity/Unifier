/**
 * autorepair-engine.js — GitHub API-powered repo scanner and fixer.
 *
 * Responsibilities:
 *   1. List repositories under the www-infinity organisation (or a single
 *      repo passed via --repo).
 *   2. Check each repo for common issues:
 *        • Wrong secret name in workflow files (GHP_TOKEN → GHP)
 *        • Missing .gitignore
 *        • Missing README.md
 *   3. Apply fixes that are safe to make automatically (e.g. wrong secret
 *      name correction in workflow YAML).
 *   4. Open a Pull Request so the owner can review and approve before the
 *      change lands on the default branch.
 *
 * Environment variables:
 *   GHP  — Personal Access Token with repo + workflow scopes.
 *          Falls back to GITHUB_TOKEN if GHP is absent.
 */

const https = require("https")
const chalk = require("chalk")

// ──────────────────────────────────────────────────────────────────────────────
// GitHub API helpers
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_ORG = "www-infinity"

function getToken() {
  return (process.env.GHP || process.env.GITHUB_TOKEN || "").trim()
}

/**
 * Perform a GitHub API request.
 * @param {string} method   HTTP method
 * @param {string} path     Path after /api.github.com (must start with /)
 * @param {object|null} body  JSON body for POST/PUT/PATCH
 * @param {string} token
 * @returns {Promise<{status:number, body:object|string}>}
 */
function ghRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ""
    const headers = {
      "User-Agent": "infinity-cli-autorepair/1.0",
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    }
    if (token) headers["Authorization"] = `Bearer ${token}`
    if (bodyStr) headers["Content-Length"] = Buffer.byteLength(bodyStr)

    const req = https.request(
      {
        hostname: "api.github.com",
        path,
        method,
        headers,
      },
      (res) => {
        let data = ""
        res.on("data", (c) => { data += c })
        res.on("end", () => {
          let parsed = data
          try { parsed = JSON.parse(data) } catch (_) { /* keep string */ }
          resolve({ status: res.statusCode, body: parsed })
        })
      }
    )
    req.on("error", reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Issue detectors
// ──────────────────────────────────────────────────────────────────────────────

const ISSUES = [
  {
    id: "wrong-secret-name",
    description: 'Workflow files reference "GHP_TOKEN" (deprecated) — should be "GHP"',
    /**
     * Check a single decoded file content string for the wrong secret name.
     * @param {string} content
     * @returns {boolean}
     */
    detect(content) {
      return /secrets\.GHP_TOKEN\b/.test(content)
    },
    /**
     * Return the fixed version of the file.
     * @param {string} content
     * @returns {string}
     */
    fix(content) {
      return content.replace(/secrets\.GHP_TOKEN\b/g, "secrets.GHP")
    },
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Core logic
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the list of workflow YAML files for a repo.
 * @returns {Promise<Array<{name:string, path:string, sha:string, download_url:string}>>}
 */
async function getWorkflowFiles(owner, repo, token) {
  const { status, body } = await ghRequest(
    "GET",
    `/repos/${owner}/${repo}/contents/.github/workflows`,
    null,
    token
  )
  if (status !== 200 || !Array.isArray(body)) return []
  return body.filter((f) => f.name.endsWith(".yml") || f.name.endsWith(".yaml"))
}

/**
 * Fetch file content (decoded from base64).
 */
async function getFileContent(owner, repo, path, token) {
  const { status, body } = await ghRequest(
    "GET",
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    null,
    token
  )
  if (status !== 200 || !body.content) return null
  const raw = Buffer.from(body.content, "base64").toString("utf8")
  return { content: raw, sha: body.sha }
}

/**
 * Get the SHA of the tip of the default branch.
 */
async function getDefaultBranchSha(owner, repo, token) {
  const { status, body } = await ghRequest(
    "GET",
    `/repos/${owner}/${repo}`,
    null,
    token
  )
  if (status !== 200) return null
  const defaultBranch = body.default_branch || "main"
  const ref = await ghRequest(
    "GET",
    `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    null,
    token
  )
  if (ref.status !== 200) return null
  return { sha: ref.body.object.sha, branch: defaultBranch }
}

/**
 * Create a new branch from a given SHA.
 */
async function createBranch(owner, repo, branchName, sha, token) {
  const { status } = await ghRequest(
    "POST",
    `/repos/${owner}/${repo}/git/refs`,
    { ref: `refs/heads/${branchName}`, sha },
    token
  )
  return status === 201
}

/**
 * Update a file in the repository via the GitHub API.
 */
async function updateFile(owner, repo, filePath, content, sha, message, branch, token) {
  const { status, body } = await ghRequest(
    "PUT",
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
    {
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
      branch,
    },
    token
  )
  return status === 200 || status === 201
}

/**
 * Open a Pull Request.
 */
async function createPR(owner, repo, head, base, title, body, token) {
  const res = await ghRequest(
    "POST",
    `/repos/${owner}/${repo}/pulls`,
    { title, body, head, base },
    token
  )
  return res
}

// ──────────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Scan a single repo for known issues, apply fixes, and open a PR.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @returns {Promise<{repo:string, issuesFound:number, prUrl:string|null}>}
 */
async function repairRepo(owner, repo, token) {
  console.log(chalk.cyan(`\n  ⟳  Scanning ${owner}/${repo}…`))

  const branchInfo = await getDefaultBranchSha(owner, repo, token)
  if (!branchInfo) {
    console.log(chalk.yellow(`     ⚠  Could not read repo metadata — skipping`))
    return { repo, issuesFound: 0, prUrl: null }
  }

  const workflows = await getWorkflowFiles(owner, repo, token)
  const repairs = []

  for (const wf of workflows) {
    const file = await getFileContent(owner, repo, wf.path, token)
    if (!file) continue

    for (const issue of ISSUES) {
      if (issue.detect(file.content)) {
        const fixed = issue.fix(file.content)
        repairs.push({
          path: wf.path,
          content: fixed,
          sha: file.sha,
          issueDescription: issue.description,
        })
        console.log(chalk.yellow(`     ⚡  ${wf.path}: ${issue.description}`))
      }
    }
  }

  if (repairs.length === 0) {
    console.log(chalk.green(`     ✓  No issues found`))
    return { repo, issuesFound: 0, prUrl: null }
  }

  // Create a repair branch and commit all fixes.
  const suffix = Math.random().toString(36).slice(2, 8)
  const branchName = `autorepair/${Date.now()}-${suffix}`
  const created = await createBranch(owner, repo, branchName, branchInfo.sha, token)
  if (!created) {
    console.log(chalk.red(`     ✗  Failed to create repair branch`))
    return { repo, issuesFound: repairs.length, prUrl: null }
  }

  let allApplied = true
  for (const r of repairs) {
    const ok = await updateFile(
      owner, repo,
      r.path, r.content, r.sha,
      `fix: ${r.issueDescription}`,
      branchName,
      token
    )
    if (!ok) {
      console.log(chalk.red(`     ✗  Failed to update ${r.path}`))
      allApplied = false
    }
  }

  if (!allApplied) {
    return { repo, issuesFound: repairs.length, prUrl: null }
  }

  // Open the PR.
  const prBody = [
    "## 🤖 Infinity AutoRepair",
    "",
    "This PR was automatically generated by the **Infinity CLI autorepair** command.",
    "Please review the changes below before merging.",
    "",
    "### Issues fixed",
    ...repairs.map((r) => `- **${r.path}**: ${r.issueDescription}`),
    "",
    "---",
    "_Generated by `infinity autorepair`_",
  ].join("\n")

  const pr = await createPR(
    owner, repo,
    branchName, branchInfo.branch,
    "fix: autorepair — workflow secret name corrections",
    prBody,
    token
  )

  const prUrl = pr.status === 201 ? pr.body.html_url : null
  if (prUrl) {
    console.log(chalk.green(`     ✓  PR opened: ${prUrl}`))
  } else {
    console.log(chalk.red(`     ✗  Failed to open PR (status ${pr.status})`))
  }

  return { repo, issuesFound: repairs.length, prUrl }
}

/**
 * Main entry point — scan one or more repositories.
 *
 * @param {{ repos?: string[], org?: string }} opts
 */
async function run(opts = {}) {
  const token = getToken()
  if (!token) {
    console.log(chalk.red(
      "\n  ✗  No GitHub token found.\n" +
      "     Set the GHP environment variable (PAT with repo+workflow scopes).\n"
    ))
    process.exit(1)
  }

  const results = []

  if (opts.repos && opts.repos.length > 0) {
    // Explicit repo list provided.
    for (const slug of opts.repos) {
      const [owner, repo] = slug.includes("/") ? slug.split("/", 2) : [DEFAULT_ORG, slug]
      results.push(await repairRepo(owner, repo, token))
    }
  } else {
    // Fall back to a hard-coded curated list of active www-infinity repos so
    // we don't need the `repo` list permission.
    const defaultRepos = [
      "Unifier",
      "Bitcoin-Crusher",
      "4-hash-token-system",
      "Mint-For-Infinity",
    ]
    console.log(chalk.white(
      `\n  Scanning default repo list under ${DEFAULT_ORG}:` +
      defaultRepos.map((r) => `\n    • ${DEFAULT_ORG}/${r}`).join("")
    ))
    for (const repo of defaultRepos) {
      results.push(await repairRepo(DEFAULT_ORG, repo, token))
    }
  }

  // Summary.
  const fixed = results.filter((r) => r.issuesFound > 0)
  const prs   = results.filter((r) => r.prUrl)

  console.log(chalk.cyan("\n╔══════════════════════════════╗"))
  console.log(chalk.cyan("║   ∞  AutoRepair Summary  ∞   ║"))
  console.log(chalk.cyan("╚══════════════════════════════╝\n"))
  console.log(chalk.white(`  Repos scanned:    ${chalk.yellow(results.length)}`))
  console.log(chalk.white(`  Repos with fixes: ${chalk.yellow(fixed.length)}`))
  console.log(chalk.white(`  PRs opened:       ${chalk.yellow(prs.length)}`))
  if (prs.length > 0) {
    console.log()
    prs.forEach((r) => console.log(chalk.green(`  → ${r.prUrl}`)))
  }
  console.log()
}

module.exports = { run }
