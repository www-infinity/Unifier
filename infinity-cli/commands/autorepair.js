const chalk = require("chalk")
const engine = require("../modules/autorepair-engine")

/**
 * autorepair command — scan GitHub repos for common issues and open PRs.
 *
 * Usage:
 *   infinity autorepair
 *   infinity autorepair --repo www-infinity/Unifier
 *   infinity autorepair --repo Unifier,Bitcoin-Crusher
 *
 * Requires a GitHub PAT in the GHP environment variable
 * (repo + workflow scopes).
 */
module.exports = async function autorepair(options = {}) {
  console.log(chalk.magenta("\n🔧  AutoRepair — scanning repositories…\n"))

  const repos = options.repo
    ? options.repo.split(",").map((r) => r.trim()).filter(Boolean)
    : []

  try {
    await engine.run({ repos })
  } catch (err) {
    console.error(chalk.red(`\n  ✗  AutoRepair failed: ${err.message}\n`))
    process.exitCode = 1
  }
}
