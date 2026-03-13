const chalk = require("chalk")
const radio = require("../modules/radio-engine")

module.exports = function (action) {
  if (action !== "build") {
    console.log(chalk.red(`Unknown radio action: ${action}`))
    console.log(chalk.yellow("Available actions: build"))
    return
  }
  console.log(chalk.cyan("\n◈  Radio — build\n"))
  radio.build()
}
