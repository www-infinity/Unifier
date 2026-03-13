const chalk = require("chalk")
const token = require("../modules/token-engine")

const ACTIONS = {
  mint: () => token.mint(),
  list: () => token.list(),
  verify: () => token.verify(),
}

module.exports = function (action) {
  const fn = ACTIONS[action]
  if (!fn) {
    console.log(chalk.red(`Unknown token action: ${action}`))
    console.log(chalk.yellow("Available actions: mint, list, verify"))
    return
  }
  console.log(chalk.cyan(`\n◈  Token — ${action}\n`))
  fn()
}
