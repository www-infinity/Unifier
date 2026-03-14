const path = require("path")

module.exports = {
  spinsDir: path.resolve(__dirname, "../spins"),
  tokensDir: path.resolve(__dirname, "../tokens"),
  walletsDir: path.resolve(__dirname, "../wallets"),
  outputDir: path.resolve(__dirname, "../output"),
  profilesDir: path.resolve(__dirname, "../profiles"),
  templatesDir: path.resolve(__dirname, "../templates"),
  treasuryFile: path.resolve(__dirname, "../data/treasury.json"),
  // GitHub Pages deployment URL — update this when hosting under a different org/repo.
  siteUrl: "https://www-infinity.github.io/Unifier/",
}
