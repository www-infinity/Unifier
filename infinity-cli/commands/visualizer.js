const chalk = require("chalk")
const visualizer = require("../modules/visualizer-engine")

module.exports = function (action) {
  if (action !== "build") {
    console.log(chalk.red(`Unknown visualizer action: ${action}`))
    console.log(chalk.yellow("Available actions: build"))
    return
  }
  console.log(chalk.cyan("\n◈  Visualizer — build\n"))
  visualizer.build()
}
