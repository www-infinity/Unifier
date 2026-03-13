const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const config = require("../config/default")
const treasuryModule = require("./treasury")

function create() {
  fse.ensureDirSync(config.walletsDir)

  const wallet = {
    id: uuidv4(),
    balance: 0,
    createdAt: new Date().toISOString(),
    transactions: [],
  }

  const walletFile = path.join(config.walletsDir, `${wallet.id}.json`)
  fse.writeJsonSync(walletFile, wallet, { spaces: 2 })

  console.log(chalk.green(`\n✓  Wallet created`))
  console.log(chalk.white(`   ID:      ${wallet.id}`))
  console.log(chalk.white(`   Balance: ${wallet.balance}`))
  console.log(chalk.white(`   Date:    ${wallet.createdAt}\n`))

  return wallet
}

function view() {
  fse.ensureDirSync(config.walletsDir)
  const files = fse.readdirSync(config.walletsDir)

  if (files.length === 0) {
    console.log(chalk.yellow("No wallets found."))
    return
  }

  console.log(chalk.cyan(`Found ${files.length} wallet(s):\n`))
  files.forEach((file) => {
    const wallet = fse.readJsonSync(path.join(config.walletsDir, file))
    console.log(
      chalk.white(
        `  ${wallet.id}  balance=${wallet.balance}  txns=${wallet.transactions.length}  date=${wallet.createdAt}`
      )
    )
  })
  console.log()
}

function distribute() {
  fse.ensureDirSync(config.walletsDir)
  const files = fse.readdirSync(config.walletsDir)

  if (files.length === 0) {
    console.log(chalk.yellow("No wallets found. Create a wallet first."))
    return
  }

  const tData = treasuryModule.load()
  if (tData.treasury === 0) {
    console.log(chalk.yellow("Treasury is empty. Mint tokens first."))
    return
  }

  const amountEach = Math.floor(tData.treasury / files.length)
  let distributed = 0

  files.forEach((file) => {
    const walletPath = path.join(config.walletsDir, file)
    const wallet = fse.readJsonSync(walletPath)
    wallet.balance += amountEach
    wallet.transactions.push({
      type: "distribute",
      amount: amountEach,
      date: new Date().toISOString(),
    })
    fse.writeJsonSync(walletPath, wallet, { spaces: 2 })
    distributed += amountEach
  })

  treasuryModule.deduct(distributed)

  console.log(chalk.green(`\n✓  Distributed ${distributed} tokens across ${files.length} wallet(s)\n`))
}

function receipt({ spinId, token, rule, outputDir }) {
  const rec = {
    spinId,
    tokenId: token.id,
    amount: token.amount,
    rule,
    date: new Date().toISOString(),
  }
  fse.writeJsonSync(path.join(outputDir, "receipt.json"), rec, { spaces: 2 })
  return rec
}

module.exports = { create, view, distribute, receipt }
