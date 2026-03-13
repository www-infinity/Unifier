const chalk = require("chalk")
const research = require("../modules/research-engine")

module.exports = function (action) {
  if (action !== "generate") {
    console.log(chalk.red(`Unknown research action: ${action}`))
    console.log(chalk.yellow("Available actions: generate"))
    return
  }
  console.log(chalk.cyan("\n◈  Research — generate\n"))
  research.generate()
}
