/**
 * nlp-engine.js — Simple keyword-based natural-language → command mapper.
 *
 * Accepts a free-text phrase and returns the best matching CLI command
 * string (e.g. "spin", "token mint", "autorepair").  No external AI
 * library is required; matching is done with weighted keyword scoring.
 */

// Each entry maps an array of trigger phrases to a resolved command string.
// Earlier / higher-weight phrases in the keyword list score more strongly.
const COMMAND_MAP = [
  {
    command: "spin",
    keywords: [
      "spin", "slot", "play", "roll", "pull lever", "pull the lever",
      "run spin", "do a spin", "machine",
    ],
  },
  {
    command: "token mint",
    keywords: [
      "mint token", "mint a token", "create token", "new token",
      "generate token", "make token",
    ],
  },
  {
    command: "token list",
    keywords: [
      "list tokens", "show tokens", "my tokens", "token list",
      "see tokens", "view tokens",
    ],
  },
  {
    command: "token verify",
    keywords: ["verify token", "check token", "validate token"],
  },
  {
    command: "wallet view",
    keywords: [
      "wallet", "my wallet", "view wallet", "show wallet",
      "balance", "wallet balance",
    ],
  },
  {
    command: "wallet create",
    keywords: ["create wallet", "new wallet", "make wallet"],
  },
  {
    command: "wallet distribute",
    keywords: ["distribute", "send tokens", "distribute tokens"],
  },
  {
    command: "research generate",
    keywords: [
      "research", "generate research", "new article", "write article",
      "research article", "create article",
    ],
  },
  {
    command: "build page",
    keywords: [
      "build page", "build site", "create page", "make page",
      "new page", "generate page",
    ],
  },
  {
    command: "build profile",
    keywords: ["build profile", "create profile", "my profile"],
  },
  {
    command: "dashboard",
    keywords: [
      "dashboard", "stats", "status", "overview",
      "show stats", "show dashboard", "system stats",
    ],
  },
  {
    command: "treasury view",
    keywords: [
      "treasury", "total tokens", "token treasury",
      "show treasury", "view treasury",
    ],
  },
  {
    command: "radio build",
    keywords: ["radio", "build radio", "radio station", "radio observatory"],
  },
  {
    command: "visualizer build",
    keywords: [
      "visualizer", "quantum visualizer", "build visualizer",
      "visualization",
    ],
  },
  {
    command: "autorepair",
    keywords: [
      "repair", "fix", "autorepair", "auto repair", "fix repos",
      "fix my repos", "repair repos", "scan repos", "heal repos",
      "check repos", "diagnose",
    ],
  },
  {
    command: "help",
    keywords: [
      "help", "commands", "what can you do", "list commands",
      "show commands", "options",
    ],
  },
]

/**
 * Normalise a string for comparison (lowercase, collapse whitespace).
 * @param {string} s
 * @returns {string}
 */
function normalise(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Score a candidate entry against the normalised input text.
 * Returns a numeric score (higher = better match).
 * @param {{ command: string, keywords: string[] }} entry
 * @param {string} input  Already normalised input text
 * @returns {number}
 */
function score(entry, input) {
  let total = 0
  for (const kw of entry.keywords) {
    const kwNorm = normalise(kw)
    if (input.includes(kwNorm)) {
      // Longer keyword matches are worth more.
      total += kwNorm.split(" ").length * 2
    } else {
      // Check individual words from the keyword phrase.
      const words = kwNorm.split(" ")
      for (const w of words) {
        if (w.length > 3 && input.includes(w)) {
          total += 1
        }
      }
    }
  }
  return total
}

/**
 * Parse free-form English text and return the best-matching command string.
 * Returns null when nothing matches with a meaningful score.
 * @param {string} text
 * @returns {{ command: string, confidence: number } | null}
 */
function parse(text) {
  const input = normalise(text)
  if (!input) return null

  let best = null
  let bestScore = 0

  for (const entry of COMMAND_MAP) {
    const s = score(entry, input)
    if (s > bestScore) {
      bestScore = s
      best = entry
    }
  }

  if (!best || bestScore === 0) return null
  return { command: best.command, confidence: bestScore }
}

module.exports = { parse }
