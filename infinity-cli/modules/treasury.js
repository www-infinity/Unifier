const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

const TREASURY_DEFAULT = { treasury: 0, distributed: 0, lastUpdated: null }

function load() {
  const dir = path.dirname(config.treasuryFile)
  fse.ensureDirSync(dir)
  if (!fse.existsSync(config.treasuryFile)) {
    fse.writeJsonSync(config.treasuryFile, TREASURY_DEFAULT, { spaces: 2 })
  }
  return fse.readJsonSync(config.treasuryFile)
}

function save(data) {
  fse.ensureDirSync(path.dirname(config.treasuryFile))
  fse.writeJsonSync(config.treasuryFile, data, { spaces: 2 })
}

function addToken(amount) {
  const data = load()
  data.treasury += amount
  data.lastUpdated = new Date().toISOString()
  save(data)
}

function deduct(amount) {
  const data = load()
  data.treasury = Math.max(0, data.treasury - amount)
  data.distributed += amount
  data.lastUpdated = new Date().toISOString()
  save(data)
}

function view() {
  const data = load()
  console.log(chalk.cyan("  Treasury Tokens:    ") + chalk.yellow(data.treasury))
  console.log(chalk.cyan("  Distributed Tokens: ") + chalk.yellow(data.distributed))
  console.log(
    chalk.cyan("  Last Updated:       ") +
      chalk.white(data.lastUpdated || "never")
  )
  console.log()
}

module.exports = { load, addToken, deduct, view }
