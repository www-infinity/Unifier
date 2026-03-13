const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const config = require("../config/default")
const research = require("./research-engine")
const tokenEngine = require("./token-engine")
const walletModule = require("./wallet")

function run() {
  const spinId = uuidv4()
  const spinDir = path.join(config.spinsDir, spinId)
  fse.ensureDirSync(spinDir)

  console.log(chalk.magenta(`Spin ID: ${spinId}\n`))

  console.log(chalk.white("  [1/4] Running research writer..."))
  const article = research.generate({ spinId, outputDir: spinDir, silent: true })

  console.log(chalk.white("  [2/4] Minting token..."))
  const token = tokenEngine.mint({ spinId, silent: true })

  console.log(chalk.white("  [3/4] Applying distribution rule..."))
  const rule = applyDistribution(token)

  console.log(chalk.white("  [4/4] Creating wallet receipt..."))
  walletModule.receipt({ spinId, token, rule, outputDir: spinDir })

  const summary = {
    spinId,
    timestamp: new Date().toISOString(),
    article: article ? article.title : null,
    token: token.id,
    rule,
  }
  fse.writeJsonSync(path.join(spinDir, "spin.json"), summary, { spaces: 2 })

  console.log(chalk.green(`\n✓  Spin complete → ${spinDir}\n`))
}

function applyDistribution(token) {
  const pct = Math.floor(Math.random() * 30) + 10
  return { type: "percent", value: pct, tokenId: token.id }
}

module.exports = { run }
