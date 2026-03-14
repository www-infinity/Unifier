const chalk = require("chalk")
const nlp = require("../modules/nlp-engine")

/**
 * ask command — accept plain-English input and dispatch to the right module.
 *
 * Usage (CLI):
 *   infinity ask "spin the slot machine"
 *   infinity ask "fix my repos"
 *   infinity ask "show me my wallet"
 *
 * Also invoked by the catch-all handler for unrecognised command words.
 */
module.exports = function ask(text) {
  if (!text || !text.trim()) {
    console.log(chalk.yellow("\nUsage: infinity ask \"what you want to do\"\n"))
    console.log(chalk.white("Examples:"))
    console.log(chalk.cyan("  infinity ask \"spin the machine\""))
    console.log(chalk.cyan("  infinity ask \"fix my repos\""))
    console.log(chalk.cyan("  infinity ask \"show my wallet\"\n"))
    return
  }

  console.log(chalk.cyan(`\n◈  NLP — parsing: "${text}"\n`))

  const result = nlp.parse(text)

  if (!result) {
    console.log(chalk.red("  ✗  Could not understand that input."))
    console.log(chalk.yellow("  Try: infinity ask \"spin\", \"fix my repos\", \"show wallet\", \"help\"\n"))
    return
  }

  const { command, confidence } = result
  console.log(chalk.green(`  ✓  Matched: ${chalk.bold(command)}  (confidence: ${confidence})\n`))

  // Dispatch to the matching module.
  const parts = command.split(" ")
  const cmd = parts[0]
  const arg = parts[1] || undefined

  try {
    switch (cmd) {
      case "spin":
        require("./spin")()
        break
      case "token":
        require("./token")(arg || "mint")
        break
      case "wallet":
        require("./wallet")(arg || "view")
        break
      case "research":
        require("./research")(arg || "generate")
        break
      case "build":
        require("./build")(arg || "page")
        break
      case "dashboard":
        require("./dashboard")()
        break
      case "treasury":
        require("./treasury")(arg || "view")
        break
      case "radio":
        require("./radio")(arg || "build")
        break
      case "visualizer":
        require("./visualizer")(arg || "build")
        break
      case "autorepair":
        require("./autorepair")()
        break
      case "help":
        // Print a concise help table.
        console.log(chalk.cyan("Available commands:"))
        const cmds = [
          ["spin", "Run a spin event"],
          ["token [mint|list|verify]", "Manage tokens"],
          ["wallet [create|view|distribute]", "Wallet management"],
          ["build [page|profile]", "Build a website component"],
          ["research [generate]", "Research engine"],
          ["radio [build]", "Radio builder"],
          ["visualizer [build]", "Visualizer builder"],
          ["treasury [view]", "Token treasury"],
          ["dashboard", "System dashboard"],
          ["autorepair", "Scan & fix GitHub repos"],
          ["ask <text>", "Natural-language command"],
        ]
        cmds.forEach(([c, d]) =>
          console.log(`  ${chalk.green(c.padEnd(32))} ${chalk.white(d)}`)
        )
        console.log()
        break
      default:
        console.log(chalk.red(`  ✗  Dispatch error: unknown command "${cmd}"`))
    }
  } catch (err) {
    console.error(chalk.red(`  ✗  Error running "${command}": ${err.message}`))
  }
}
