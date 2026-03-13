const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const config = require("../config/default")
const treasuryModule = require("./treasury")

function mint(opts = {}) {
  const { spinId = null, silent = false } = opts
  fse.ensureDirSync(config.tokensDir)

  const token = {
    id: uuidv4(),
    spinId,
    amount: Math.floor(Math.random() * 1000) + 1,
    createdAt: new Date().toISOString(),
  }

  const tokenFile = path.join(config.tokensDir, `${token.id}.json`)
  fse.writeJsonSync(tokenFile, token, { spaces: 2 })

  treasuryModule.addToken(token.amount)

  if (!silent) {
    console.log(chalk.green(`\n✓  Token minted`))
    console.log(chalk.white(`   ID:     ${token.id}`))
    console.log(chalk.white(`   Amount: ${token.amount}`))
    console.log(chalk.white(`   Date:   ${token.createdAt}\n`))
  }

  return token
}

function list() {
  fse.ensureDirSync(config.tokensDir)
  const files = fse.readdirSync(config.tokensDir)

  if (files.length === 0) {
    console.log(chalk.yellow("No tokens found."))
    return
  }

  console.log(chalk.cyan(`Found ${files.length} token(s):\n`))
  files.forEach((file) => {
    const token = fse.readJsonSync(path.join(config.tokensDir, file))
    console.log(
      chalk.white(`  ${token.id}  amount=${token.amount}  date=${token.createdAt}`)
    )
  })
  console.log()
}

function verify() {
  fse.ensureDirSync(config.tokensDir)
  const files = fse.readdirSync(config.tokensDir)

  let valid = 0
  let invalid = 0

  files.forEach((file) => {
    try {
      const token = fse.readJsonSync(path.join(config.tokensDir, file))
      if (token.id && token.amount && token.createdAt) {
        valid++
      } else {
        invalid++
      }
    } catch (_) {
      invalid++
    }
  })

  console.log(chalk.green(`  Valid tokens:   ${valid}`))
  console.log(chalk.red(`  Invalid tokens: ${invalid}\n`))
}

module.exports = { mint, list, verify }
