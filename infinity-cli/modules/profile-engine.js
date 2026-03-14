const chalk = require("chalk")
const fse = require("fs-extra")
const path = require("path")
const config = require("../config/default")

/* ------------------------------------------------------------------
   SYMBOLS — mirrors assets/app.js SYMBOLS array
------------------------------------------------------------------ */
const REEL_COUNT = 5

const SYMBOLS = [
  { emoji: "₿",  label: "BTC",   value: 3,  weight: 8 },
  { emoji: "💎", label: "DIAM",  value: 5,  weight: 6 },
  { emoji: "∞",  label: "INF",   value: 8,  weight: 5 },
  { emoji: "🧱", label: "BLOCK", value: 4,  weight: 7 },
  { emoji: "⭐", label: "STAR",  value: 2,  weight: 10 },
  { emoji: "🍄", label: "MARIO", value: 6,  weight: 5 },
  { emoji: "👑", label: "CROWN", value: 7,  weight: 4 },
  { emoji: "🚀", label: "PUMP",  value: 9,  weight: 3 },
  { emoji: "💰", label: "BAG",   value: 4,  weight: 7 },
  { emoji: "🔥", label: "FIRE",  value: 3,  weight: 9 },
  { emoji: "🥇", label: "GOLD",  value: 10, weight: 2 },
  { emoji: "🌕", label: "MOON",  value: 6,  weight: 5 },
]

/* ------------------------------------------------------------------
   SYMBOL → SCIENCE DOMAIN MAPPING — mirrors assets/research.js
------------------------------------------------------------------ */
const SYMBOL_DOMAINS = {
  BTC:   ["quantum_computing", "cryptography", "number_theory"],
  DIAM:  ["materials_science", "crystallography", "carbon_chemistry"],
  INF:   ["mathematics", "topology", "information_theory"],
  BLOCK: ["solid_state_physics", "polymer_chemistry", "nanotechnology"],
  STAR:  ["astrophysics", "nuclear_fusion", "stellar_evolution"],
  MARIO: ["mycology", "biochemistry", "pharmacology"],
  CROWN: ["metallurgy", "electrochemistry", "surface_science"],
  PUMP:  ["aerospace", "fluid_dynamics", "thermodynamics"],
  BAG:   ["biophysics", "molecular_biology", "proteomics"],
  FIRE:  ["combustion_chemistry", "plasma_physics", "thermodynamics"],
  GOLD:  ["noble_metal_chemistry", "catalysis", "bioelectronics"],
  MOON:  ["selenology", "tidal_mechanics", "planetary_science"],
}

/* ------------------------------------------------------------------
   DOMAIN VOCABULARY — nouns and adjectives per domain,
   mirrors the VOCAB structure in assets/research.js
------------------------------------------------------------------ */
const VOCAB = {
  quantum_computing: {
    nouns: ["qubit coherence time", "superposition state", "entanglement fidelity",
      "topological qubit", "quantum gate fidelity", "decoherence rate",
      "quantum error correction code", "variational ansatz", "quantum volume"],
    adjectives: ["coherent", "fault-tolerant", "topologically protected",
      "error-mitigated", "variational", "decoherence-free", "adiabatic"],
  },
  cryptography: {
    nouns: ["elliptic-curve scalar multiplication", "SHA-256 hash digest",
      "zero-knowledge succinct argument", "digital signature scheme",
      "homomorphic ciphertext", "commitment scheme", "lattice basis reduction"],
    adjectives: ["cryptographically secure", "collision-resistant",
      "lattice-based", "post-quantum", "zero-knowledge", "trapdoor"],
  },
  number_theory: {
    nouns: ["prime factorisation", "modular arithmetic residue",
      "Fermat's little theorem", "Mersenne prime distribution",
      "elliptic curve group order", "quadratic residue"],
    adjectives: ["modular", "irreducible", "coprime", "multiplicative", "Galois"],
  },
  materials_science: {
    nouns: ["crystal lattice parameter", "grain boundary energy",
      "dislocation density", "elastic modulus", "fracture toughness"],
    adjectives: ["polycrystalline", "amorphous", "anisotropic", "strain-hardened", "nanostructured"],
  },
  crystallography: {
    nouns: ["unit cell symmetry", "Bragg diffraction condition",
      "reciprocal lattice vector", "crystal packing fraction", "space group symmetry"],
    adjectives: ["monoclinic", "orthorhombic", "hexagonal", "tetragonal", "triclinic"],
  },
  carbon_chemistry: {
    nouns: ["sp² hybridisation degree", "conjugated π-system",
      "fullerene cage symmetry", "graphene sheet conductivity",
      "armchair chirality vector", "Stone–Wales defect"],
    adjectives: ["conjugated", "aromatic", "chiral", "metallic", "semiconducting", "defect-engineered"],
  },
  mathematics: {
    nouns: ["Hausdorff dimension", "topological invariant",
      "Fourier series convergence", "Banach space norm", "Riemannian metric tensor"],
    adjectives: ["differentiable", "compact", "measurable", "stochastic", "Hilbert-space"],
  },
  topology: {
    nouns: ["homotopy group", "Euler characteristic",
      "manifold curvature", "knot invariant", "homology class"],
    adjectives: ["simply connected", "orientable", "compact", "symplectic", "fibred"],
  },
  information_theory: {
    nouns: ["Shannon entropy", "mutual information",
      "channel capacity", "Kolmogorov complexity", "codon usage bias",
      "rate-distortion function", "typical set cardinality"],
    adjectives: ["lossless", "source-coded", "capacity-achieving", "entropic", "stochastic"],
  },
  solid_state_physics: {
    nouns: ["phonon dispersion relation", "Fermi surface topology",
      "band gap energy", "density of states", "Wannier function"],
    adjectives: ["metallic", "semiconducting", "topological", "superconducting", "excitonic"],
  },
  polymer_chemistry: {
    nouns: ["chain conformation entropy", "glass transition temperature",
      "degree of polymerisation", "viscosity coefficient", "end-to-end distance"],
    adjectives: ["amorphous", "semi-crystalline", "cross-linked", "entangled", "viscoelastic"],
  },
  nanotechnology: {
    nouns: ["quantum confinement energy", "surface plasmon resonance wavelength",
      "nanoparticle size distribution", "quantum dot photoluminescence",
      "nanopore translocation signal", "core-shell morphology"],
    adjectives: ["nanoscale", "quantum-confined", "monodisperse", "self-assembled", "surface-enhanced"],
  },
  astrophysics: {
    nouns: ["neutron star merger", "accretion disc luminosity",
      "gravitational wave strain", "dark matter halo density profile",
      "r-process nucleosynthesis yield", "pulsar timing residual"],
    adjectives: ["relativistic", "supermassive", "degenerate", "magnetised", "isotropic"],
  },
  nuclear_fusion: {
    nouns: ["plasma confinement time", "Lawson criterion value",
      "deuterium-tritium fuel pellet", "magnetic reconnection event",
      "ELM burst energy", "divertor heat flux"],
    adjectives: ["thermonuclear", "magnetically confined", "suprathermal", "MHD-stable", "turbulent"],
  },
  stellar_evolution: {
    nouns: ["hydrogen-burning shell", "helium flash",
      "white dwarf cooling track", "supernova progenitor mass",
      "asymptotic giant branch", "planetary nebula shell"],
    adjectives: ["post-main-sequence", "carbon-oxygen", "electron-degenerate", "convective", "radiative"],
  },
  mycology: {
    nouns: ["mycorrhizal network hyphal anastomosis", "sporocarp morphology",
      "secondary metabolite profile", "chitin cell-wall composition",
      "dikaryotic mycelium", "basidiospore germination"],
    adjectives: ["saprophytic", "endophytic", "ectomycorrhizal", "biotrophic", "necrotrophic"],
  },
  biochemistry: {
    nouns: ["adenosine triphosphate hydrolysis", "enzyme kinetics constant",
      "allosteric regulatory site", "NADH oxidoreductase complex",
      "metabolic flux analysis", "reactive oxygen species"],
    adjectives: ["enzymatic", "allosteric", "redox-active", "post-translational", "bifunctional"],
  },
  pharmacology: {
    nouns: ["IC50 inhibition constant", "bioavailability coefficient",
      "blood-brain barrier permeability", "ADMET profile",
      "receptor binding affinity", "therapeutic index"],
    adjectives: ["pharmacokinetic", "bioavailable", "selective", "potent", "non-toxic"],
  },
  metallurgy: {
    nouns: ["yield strength", "Hall–Petch relationship",
      "precipitation hardening", "intermetallic phase",
      "Charpy impact energy", "creep rupture life"],
    adjectives: ["high-entropy", "refractory", "light-weight", "corrosion-resistant", "ductile"],
  },
  electrochemistry: {
    nouns: ["Faradaic efficiency", "overpotential barrier",
      "Butler–Volmer equation", "electric double-layer capacitance",
      "electrolyte conductivity", "cyclic voltammogram"],
    adjectives: ["electroactive", "redox-active", "electrocatalytic", "anodic", "cathodic"],
  },
  surface_science: {
    nouns: ["surface adsorption energy", "work function shift",
      "monolayer coverage", "contact angle hysteresis",
      "surface reconstruction pattern", "Auger electron spectrum"],
    adjectives: ["hydrophilic", "hydrophobic", "self-assembled", "ultra-high-vacuum", "reconstructed"],
  },
  thermodynamics: {
    nouns: ["entropy production rate", "Gibbs free energy landscape",
      "Carnot efficiency limit", "Seebeck coefficient",
      "exergy destruction", "enthalpy of formation"],
    adjectives: ["isentropic", "isothermal", "non-equilibrium", "irreversible", "quasi-static"],
  },
  plasma_physics: {
    nouns: ["Debye shielding length", "plasma oscillation frequency",
      "magnetohydrodynamic wave", "Alfvén speed",
      "ion acoustic instability", "electron cyclotron resonance"],
    adjectives: ["magnetised", "collisional", "turbulent", "non-thermal", "weakly coupled"],
  },
  combustion_chemistry: {
    nouns: ["flame temperature", "equivalence ratio",
      "laminar burning velocity", "detonation wave speed",
      "soot formation pathway", "NOₓ emission index"],
    adjectives: ["stoichiometric", "lean", "rich", "premixed", "diffusion", "supercritical"],
  },
  aerospace: {
    nouns: ["specific impulse", "combustion instability mode",
      "hypersonic boundary layer", "Hohmann transfer orbit",
      "delta-V budget", "ion thruster efficiency"],
    adjectives: ["hypersonic", "supersonic", "cryogenic", "reusable", "geostationary"],
  },
  fluid_dynamics: {
    nouns: ["Reynolds number", "turbulent boundary layer thickness",
      "Navier–Stokes solution", "vortex shedding frequency",
      "Kolmogorov length scale", "cavitation threshold pressure"],
    adjectives: ["laminar", "turbulent", "incompressible", "viscous", "inviscid"],
  },
  biophysics: {
    nouns: ["membrane potential gradient", "cytoskeletal force transmission",
      "single-molecule diffusion constant", "lipid bilayer thickness",
      "mechanosensitive ion channel gating"],
    adjectives: ["viscoelastic", "mechanosensitive", "active", "passive", "dissipative"],
  },
  molecular_biology: {
    nouns: ["DNA replication fidelity", "transcription factor binding affinity",
      "ribosomal translocation rate", "codon usage bias",
      "gene regulatory network topology"],
    adjectives: ["epigenetic", "post-transcriptional", "allosteric", "regulatory", "non-coding"],
  },
  proteomics: {
    nouns: ["protein folding energy landscape", "post-translational modification",
      "disulfide bond formation", "proteasomal degradation rate",
      "intrinsically disordered region"],
    adjectives: ["intrinsically disordered", "globular", "multimeric", "ubiquitinated", "glycosylated"],
  },
  noble_metal_chemistry: {
    nouns: ["oxidation state assignment", "coordination complex geometry",
      "ligand field splitting energy", "d-orbital occupation",
      "reductive elimination rate"],
    adjectives: ["coordinatively saturated", "electron-deficient", "π-acidic", "σ-basic", "noble"],
  },
  catalysis: {
    nouns: ["turnover frequency", "activation energy barrier",
      "transition state geometry", "catalyst selectivity",
      "reaction intermediate lifetime"],
    adjectives: ["heterogeneous", "homogeneous", "photo-catalytic", "enantioselective", "bifunctional"],
  },
  bioelectronics: {
    nouns: ["biocompatible electrode interface", "neural signal transduction",
      "redox-active biomolecule", "organic semiconductor film"],
    adjectives: ["biocompatible", "flexible", "implantable", "biodegradable", "self-healing"],
  },
  selenology: {
    nouns: ["lunar regolith composition", "impact basin stratigraphy",
      "KREEP formation mechanism", "polar ice deposit"],
    adjectives: ["anorthosite-rich", "impact-melt", "regolith-covered", "volcanic", "primordial"],
  },
  tidal_mechanics: {
    nouns: ["tidal locking timescale", "tidal dissipation factor",
      "orbital resonance ratio", "Roche limit proximity", "Love number"],
    adjectives: ["tidally locked", "synchronously rotating", "resonant", "eccentric", "oblique"],
  },
  planetary_science: {
    nouns: ["core differentiation", "mantle convection cell",
      "impact crater morphology", "volatile inventory", "magnetic dynamo"],
    adjectives: ["differentiated", "volcanic", "impact-generated", "primordial", "volatile-rich"],
  },
}

/* ------------------------------------------------------------------
   HELPERS
------------------------------------------------------------------ */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const cap  = (s)   => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const totalWeight = SYMBOLS.reduce((a, s) => a + s.weight, 0)

function pickSymbol() {
  let r = Math.random() * totalWeight
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s }
  return SYMBOLS[SYMBOLS.length - 1]
}

function getDomainsForSpin(symbolLabels) {
  const domains = new Set()
  ;(symbolLabels || []).forEach((label) => {
    ;(SYMBOL_DOMAINS[label] || ["nanotechnology"]).forEach((d) => domains.add(d))
  })
  if (!domains.size) domains.add("nanotechnology")
  return Array.from(domains)
}

function getVocabForDomains(domains) {
  const nouns = [], adjectives = []
  domains.forEach((d) => {
    const v = VOCAB[d]
    if (v) { nouns.push(...v.nouns); adjectives.push(...v.adjectives) }
  })
  if (!nouns.length)      nouns.push("quantum state", "nanomaterial", "molecular system")
  if (!adjectives.length) adjectives.push("novel", "advanced", "quantum-enhanced")
  return { nouns, adjectives }
}

/* ------------------------------------------------------------------
   TITLE GENERATOR — mirrors generateTitle() in assets/research.js
------------------------------------------------------------------ */
function generateTitle(domains, vocab) {
  const d0 = (domains[0] || "nanotechnology").replace(/_/g, " ")
  const d1 = (domains[1] || domains[0] || "materials science").replace(/_/g, " ")
  const templates = [
    () => `${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} via ${cap(pick(vocab.nouns))}: Implications for ${d0}`,
    () => `Quantum-Enhanced ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${d0} Systems`,
    () => `Mechanisms of ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${d1} Networks`,
    () => `${cap(pick(vocab.adjectives))} Control of ${cap(pick(vocab.nouns))} for Advanced ${d0} Applications`,
    () => `Synergistic ${cap(pick(vocab.nouns))} and ${cap(pick(vocab.nouns))} in ${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} Matrices`,
    () => `High-Performance ${cap(pick(vocab.adjectives))} ${d0}: ${cap(pick(vocab.nouns))} Synthesis and Characterisation`,
    () => `${cap(pick(vocab.adjectives))} ${cap(pick(vocab.nouns))} Coupling in ${cap(pick(vocab.adjectives))} ${d0} Architectures`,
    () => `Role of ${cap(pick(vocab.nouns))} in Governing ${cap(pick(vocab.adjectives))} Behaviour in ${d1}`,
  ]
  return pick(templates)()
}

/* ------------------------------------------------------------------
   EVALUATE — mirrors evaluate() in assets/app.js
------------------------------------------------------------------ */
function evaluate(symbols) {
  const counts = {}
  symbols.forEach((s) => { counts[s.label] = (counts[s.label] || 0) + 1 })
  const max   = Math.max(...Object.values(counts))
  const total = symbols.reduce((a, s) => a + s.value, 0)
  if (max === 5) return { tier: "jackpot",    label: "🎰 JACKPOT! ALL MATCH!",     score: total * 50 }
  if (max === 4) return { tier: "win-big",    label: "💎 MEGA WIN — 4 of a kind!", score: total * 12 }
  if (max === 3) return { tier: "win-medium", label: "⭐ BIG WIN — 3 of a kind!",  score: total * 5  }
  if (max === 2) return { tier: "win-small",  label: "✅ WIN — pair found!",        score: total * 2  }
  return           { tier: "lose",          label: "🔄 No match. Spin again.",     score: 0          }
}

/* ------------------------------------------------------------------
   LOGGER — mirrors the log() function in assets/app.js
   Format: [H:MM:SS AM/PM] message
------------------------------------------------------------------ */
function log(msg, type = "") {
  const ts   = new Date().toLocaleTimeString()
  const line = `[${ts}] ${msg}`
  if (type === "warn")     console.log(chalk.yellow(line))
  else if (type === "ok")  console.log(chalk.green(line))
  else if (type === "err") console.log(chalk.red(line))
  else                     console.log(chalk.white(line))
}

/* ------------------------------------------------------------------
   BUILD PROFILE
------------------------------------------------------------------ */
function buildProfile() {
  console.log(chalk.cyan("build your profile."))

  const ghpSecret = (process.env.GHP_SECRET || process.env.GITHUB_TOKEN || "").trim()

  if (!ghpSecret) {
    log("⚠️  No GHP secret — spins are local only.", "warn")
  }

  // Spin the reels
  const finals       = Array.from({ length: REEL_COUNT }, () => pickSymbol())
  const symbolLabels = finals.map((s) => s.label)
  const domains      = getDomainsForSpin(symbolLabels)
  const vocab        = getVocabForDomains(domains)

  // Generate research token
  const title = generateTitle(domains, vocab)
  log(`🔬 Research token generated: "${title}"`, "ok")

  // Commit check
  if (!ghpSecret) {
    log("⚠️  GHP secret not available — skipping repo commit (local spin only).", "warn")
  }

  // Evaluate and log spin result
  const res      = evaluate(finals)
  const emojis   = finals.map((s) => s.emoji).join(" ")
  const spinNum  = 1  // profile build always performs a single spin
  log(`🎰 Spin #${spinNum}: ${emojis} → ${res.label} (+${res.score} pts)`, res.tier !== "lose" ? "ok" : "")

  // Persist profile record
  const profilesDir = config.profilesDir
  fse.ensureDirSync(profilesDir)

  const profile = {
    timestamp    : new Date().toISOString(),
    symbols      : finals.map((s) => s.emoji),
    labels       : symbolLabels,
    result       : res.label,
    tier         : res.tier,
    score        : res.score,
    research     : { title, domains },
    committed    : false,
  }

  const profileFile = path.join(profilesDir, `profile-${Date.now()}.json`)
  fse.writeJsonSync(profileFile, profile, { spaces: 2 })

  console.log(chalk.green(`\n✓  Profile built → ${profileFile}\n`))
}

module.exports = { buildProfile }
