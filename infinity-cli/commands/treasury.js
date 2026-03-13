const chalk = require("chalk")
const treasury = require("../modules/treasury")

module.exports = function (action) {
  if (action !== "view") {
    console.log(chalk.red(`Unknown treasury action: ${action}`))
    console.log(chalk.yellow("Available actions: view"))
    return
  }
  console.log(chalk.cyan("\n◈  Treasury — view\n"))
  treasury.view()
}
