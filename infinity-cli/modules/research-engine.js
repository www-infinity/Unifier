const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

const TOPICS = [
  "Quantum entanglement and information transfer",
  "Hydrogen 21cm line observations",
  "Bitcoin network topology",
  "Token economics and incentive design",
  "Radio telescope signal processing",
  "Blockchain consensus mechanisms",
  "Distributed ledger technology",
  "Cosmic microwave background radiation",
]

const SOURCES = [
  "arXiv:2301.00001",
  "arXiv:2302.00345",
  "arXiv:2303.11512",
  "arXiv:2304.07823",
  "arXiv:2305.09211",
]

function generate(opts = {}) {
  const { spinId = null, outputDir = null, silent = false } = opts

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)]

  const article = {
    title: `Research: ${topic}`,
    topic,
    source,
    spinId,
    generatedAt: new Date().toISOString(),
    summary: `This article explores ${topic.toLowerCase()}. Source: ${source}.`,
    equations: ["E = mc²", "H = -Σ p(x) log p(x)", "∇²ψ + k²ψ = 0"],
  }

  const saveDir = outputDir || config.spinsDir
  fse.ensureDirSync(saveDir)
  const articleFile = path.join(saveDir, "research.json")
  fse.writeJsonSync(articleFile, article, { spaces: 2 })

  if (!silent) {
    console.log(chalk.green("\n✓  Research generated"))
    console.log(chalk.white(`   Title:  ${article.title}`))
    console.log(chalk.white(`   Source: ${article.source}`))
    console.log(chalk.white(`   File:   ${articleFile}\n`))
  }

  return article
}

module.exports = { generate }
