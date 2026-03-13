const chalk = require("chalk")
const wallet = require("../modules/wallet")

const ACTIONS = {
  create: () => wallet.create(),
  view: () => wallet.view(),
  distribute: () => wallet.distribute(),
}

module.exports = function (action) {
  const fn = ACTIONS[action]
  if (!fn) {
    console.log(chalk.red(`Unknown wallet action: ${action}`))
    console.log(chalk.yellow("Available actions: create, view, distribute"))
    return
  }
  console.log(chalk.cyan(`\n◈  Wallet — ${action}\n`))
  fn()
}
