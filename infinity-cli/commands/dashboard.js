const chalk = require("chalk")
const treasury = require("../modules/treasury")
const fse = require("fs-extra")
const config = require("../config/default")

module.exports = function () {
  const spins = countItems(config.spinsDir)
  const tokens = countItems(config.tokensDir)
  const wallets = countItems(config.walletsDir)
  const tData = treasury.load()

  console.log(chalk.cyan("\n╔══════════════════════════════╗"))
  console.log(chalk.cyan("║     ∞  INFINITY SYSTEM  ∞    ║"))
  console.log(chalk.cyan("╚══════════════════════════════╝\n"))
  console.log(chalk.white(`  Spins Today:          ${chalk.yellow(spins)}`))
  console.log(chalk.white(`  Tokens Minted:        ${chalk.yellow(tokens)}`))
  console.log(chalk.white(`  Tokens Distributed:   ${chalk.yellow(tData.distributed)}`))
  console.log(chalk.white(`  Treasury Tokens:      ${chalk.yellow(tData.treasury)}`))
  console.log(chalk.white(`  Active Wallets:       ${chalk.yellow(wallets)}`))
  console.log()
}

function countItems(dir) {
  try {
    fse.ensureDirSync(dir)
    return fse.readdirSync(dir).length
  } catch (_) {
    return 0
  }
}
