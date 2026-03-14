#!/usr/bin/env node

const { program } = require("commander")
const chalk = require("chalk")

console.log(chalk.cyan("\n  ∞  INFINITY CLI  ∞\n"))

program
  .name("infinity")
  .description("Infinity Operating System CLI")
  .version("1.0.0")

program
  .command("spin")
  .description("Run a spin event (research → token → distribution → wallet)")
  .action(() => {
    require("./commands/spin")()
  })

program
  .command("token")
  .description("Manage tokens (mint | list | verify)")
  .argument("[action]", "Action: mint, list, verify", "mint")
  .action((action) => {
    require("./commands/token")(action)
  })

program
  .command("wallet")
  .description("Wallet management (create | view | distribute)")
  .argument("[action]", "Action: create, view, distribute", "create")
  .action((action) => {
    require("./commands/wallet")(action)
  })

program
  .command("build")
  .description("Build a website component (page)")
  .argument("[target]", "Build target: page, profile", "page")
  .action((target) => {
    require("./commands/build")(target)
  })

program
  .command("research")
  .description("Research engine (generate)")
  .argument("[action]", "Action: generate", "generate")
  .action((action) => {
    require("./commands/research")(action)
  })

program
  .command("radio")
  .description("Radio builder (build)")
  .argument("[action]", "Action: build", "build")
  .action((action) => {
    require("./commands/radio")(action)
  })

program
  .command("visualizer")
  .description("Visualizer builder (build)")
  .argument("[action]", "Action: build", "build")
  .action((action) => {
    require("./commands/visualizer")(action)
  })

program
  .command("treasury")
  .description("Token treasury (view)")
  .argument("[action]", "Action: view", "view")
  .action((action) => {
    require("./commands/treasury")(action)
  })

program
  .command("dashboard")
  .description("Show the Infinity system dashboard")
  .action(() => {
    require("./commands/dashboard")()
  })

program
  .command("ask")
  .description("Ask in plain English — NLP maps your text to a command")
  .argument("[text...]", "What you want to do, in natural language")
  .action((text) => {
    require("./commands/ask")(text.join(" "))
  })

program
  .command("autorepair")
  .description("Scan GitHub repos for issues and open fix PRs")
  .option("--repo <repos>", "Comma-separated list of repo slugs (e.g. Unifier,Bitcoin-Crusher)")
  .action((options) => {
    require("./commands/autorepair")(options)
  })

// Catch-all: treat unrecognised input as natural language.
program.on("command:*", (operands) => {
  require("./commands/ask")(operands.join(" "))
})

program.parse()
