const chalk = require("chalk")
const inquirer = require("inquirer")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

const RADIO_CHANNELS = [
  "Index Radio",
  "Hydrogen Channel (21cm)",
  "AM Station Tuner",
  "Signal Visualizer",
]

function build() {
  inquirer
    .prompt([
      {
        type: "checkbox",
        name: "channels",
        message: "Select radio channels to build:",
        choices: RADIO_CHANNELS,
      },
    ])
    .then((answers) => {
      if (answers.channels.length === 0) {
        console.log(chalk.yellow("No channels selected. Aborting."))
        return
      }

      fse.ensureDirSync(config.outputDir)
      const outputPath = path.join(config.outputDir, `radio-${Date.now()}.html`)
      const html = generateRadioHTML(answers.channels)
      fse.writeFileSync(outputPath, html)

      console.log(chalk.green(`\n✓  Radio page built: ${outputPath}\n`))
    })
}

function generateRadioHTML(channels) {
  const channelSections = channels
    .map(
      (ch) => `
  <section class="channel">
    <h2>📡 ${ch}</h2>
    <div class="freq-bar"><div class="freq-fill"></div></div>
    <p class="status">Scanning...</p>
  </section>`
    )
    .join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Infinity Radio Observatory</title>
  <style>
    body { background: #050510; color: #00ffcc; font-family: monospace; padding: 2rem; }
    h1 { text-align: center; letter-spacing: 0.3em; margin-bottom: 2rem; }
    .channel { border: 1px solid #00ffcc33; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
    .channel h2 { margin: 0 0 0.5rem; font-size: 1rem; }
    .freq-bar { background: #001a12; height: 8px; border-radius: 4px; overflow: hidden; }
    .freq-fill { height: 100%; width: 60%; background: #00ffcc; animation: pulse 2s ease-in-out infinite; }
    .status { margin: 0.5rem 0 0; font-size: 0.8rem; color: #00aa88; }
    @keyframes pulse { 0%,100% { width:20% } 50% { width:80% } }
  </style>
</head>
<body>
  <h1>∞ INFINITY RADIO OBSERVATORY ∞</h1>
${channelSections}
</body>
</html>`
}

module.exports = { build }
