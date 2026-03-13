const chalk = require("chalk")
const inquirer = require("inquirer")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

const VISUALIZER_OPTIONS = [
  "Token Constellation",
  "Quantum Field",
  "Radio Spectrum",
  "Wallet Galaxy",
]

function build() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "type",
        message: "Select visualizer type:",
        choices: VISUALIZER_OPTIONS,
      },
    ])
    .then((answers) => {
      const vizType = answers.type
      console.log(chalk.cyan(`\nBuilding: ${vizType}...\n`))

      fse.ensureDirSync(config.outputDir)
      const filename = vizType.toLowerCase().replace(/\s+/g, "-") + "-visualizer.html"
      const outputPath = path.join(config.outputDir, filename)

      const html = generateVisualizerHTML(vizType)
      fse.writeFileSync(outputPath, html)

      console.log(chalk.green(`✓  Visualizer built: ${outputPath}\n`))
    })
}

function generateVisualizerHTML(type) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${type} Visualizer</title>
  <style>
    body { background: #000; color: #00ffcc; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    canvas { border: 1px solid #00ffcc33; }
    h1 { position: absolute; top: 1rem; text-align: center; width: 100%; font-size: 1.2rem; letter-spacing: 0.2em; }
  </style>
</head>
<body>
  <h1>∞ ${type.toUpperCase()} ∞</h1>
  <canvas id="viz" width="800" height="600"></canvas>
  <script>
    const canvas = document.getElementById('viz')
    const ctx = canvas.getContext('2d')
    const type = "${type}"
    let t = 0

    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 1

      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2 + t
        const r = 200 + Math.sin(t * 3 + i) * 80
        const x = canvas.width / 2 + Math.cos(angle) * r
        const y = canvas.height / 2 + Math.sin(angle) * r
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.stroke()
      }
      t += 0.01
      requestAnimationFrame(draw)
    }
    draw()
  </script>
</body>
</html>`
}

module.exports = { build }
