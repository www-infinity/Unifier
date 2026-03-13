const chalk = require("chalk")
const inquirer = require("inquirer")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

const COMPONENT_CHOICES = [
  "Bitcoin Slot",
  "Token Network",
  "Quantum Visualizer",
  "Research Feed",
  "Wallet Viewer",
  "Radio Observatory",
]

function buildPage(selectedComponents) {
  const templatesDir = config.templatesDir
  const outputDir = config.outputDir
  fse.ensureDirSync(outputDir)

  const timestamp = Date.now()
  const pageName = `page-${timestamp}.html`
  const outputPath = path.join(outputDir, pageName)

  let sections = ""
  for (const component of selectedComponents) {
    const templateFile = path.join(
      templatesDir,
      componentToFilename(component)
    )
    if (fse.existsSync(templateFile)) {
      const snippet = fse.readFileSync(templateFile, "utf8")
      sections += snippet + "\n"
    } else {
      sections += `<!-- ${component} template not found -->\n`
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Infinity Page</title>
  <style>
    body { background: #0a0a0a; color: #00ffcc; font-family: monospace; padding: 1rem; }
  </style>
</head>
<body>
${sections}
</body>
</html>`

  fse.writeFileSync(outputPath, html)
  console.log(chalk.green(`\n✓  Page built: ${outputPath}\n`))
}

function componentToFilename(component) {
  return component.toLowerCase().replace(/\s+/g, "-") + ".html"
}

module.exports = function (target) {
  if (target !== "page") {
    console.log(chalk.red(`Unknown build target: ${target}`))
    console.log(chalk.yellow("Available targets: page"))
    return
  }

  console.log(chalk.cyan("\n◈  Build — page\n"))

  inquirer
    .prompt([
      {
        type: "checkbox",
        name: "modules",
        message: "Select components to include:",
        choices: COMPONENT_CHOICES,
      },
    ])
    .then((answers) => {
      if (answers.modules.length === 0) {
        console.log(chalk.yellow("No components selected. Aborting."))
        return
      }
      buildPage(answers.modules)
    })
}
