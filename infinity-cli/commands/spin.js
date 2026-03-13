const chalk = require("chalk")
const spin = require("../modules/spin-engine")

module.exports = function () {
  console.log(chalk.magenta("\n⟳  Running spin event...\n"))
  spin.run()
}
