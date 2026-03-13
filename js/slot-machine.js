/**
 * slot-machine.js
 * Bitcoin slot machine logic.
 * On spin: triggers QuantumField.spinBurst + creates a token + updates network + feed.
 */
(function () {
  'use strict';

  // ── Reel symbols ──────────────────────────────
  const SYMBOLS = ['₿', '⭐', '🧱', '💲', '🧬', '📜', '7️⃣', '🔮'];

  // Symbol → token type mapping
  const SYM_TYPE = {
    '🧱': 'research',
    '⭐': 'discovery',
    '💲': 'economic',
    '🧬': 'science',
    '📜': 'archive',
    '₿':  'research',
    '7️⃣': 'discovery',
    '🔮': 'science'
  };

  const TYPE_ICON = {
    research:  '🧱',
    discovery: '⭐',
    economic:  '💲',
    science:   '🧬',
    archive:   '📜'
  };

  const ONTOLOGY_POOL = [
    ['hydrogen','oxide','compression'],
    ['fusion','energy','plasma'],
    ['quantum','field','entanglement'],
    ['carbon','lattice','structure'],
    ['neural','network','topology'],
    ['cosmic','radiation','photon'],
    ['dark','matter','gravity'],
    ['bitcoin','hash','block']
  ];

  let spinCount  = 0;
  let tokenCount = 0;
  let totalValue = 0;
  let nextId     = 2000;

  const reels    = document.querySelectorAll('.reel');
  const spinBtn  = document.getElementById('spin-btn');
  const result   = document.getElementById('slot-result');

  if (!spinBtn) return;

  // Seed counters from token data once it is available
  function seedFromData() {
    if (window.TOKEN_DATA && window.TOKEN_DATA.tokens) {
      tokenCount = window.TOKEN_DATA.tokens.length;
      totalValue = window.TOKEN_DATA.tokens.reduce((s, t) => s + (t.value || 0), 0);
      const maxId = window.TOKEN_DATA.tokens.reduce((m, t) => Math.max(m, parseInt(t.id) || 0), 0);
      nextId = maxId + 1;
    }
    updateStats();
  }

  // app:ready is fired by app.js once JSON has loaded
  document.addEventListener('app:ready', seedFromData);
  // Also try immediately in case data arrived before us
  if (window.TOKEN_DATA) seedFromData();

  // ── Spin handler ──────────────────────────────
  spinBtn.addEventListener('click', spin);

  function spin() {
    spinBtn.disabled = true;
    result.textContent = '';
    result.className   = '';
    spinCount++;

    // Start reel animations
    reels.forEach(r => r.classList.add('spinning'));

    // Show random symbols while spinning
    const spinInterval = setInterval(() => {
      reels.forEach(r => {
        r.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      });
    }, 80);

    // Resolve after random delay
    const delay = 1000 + Math.random() * 800;
    setTimeout(() => {
      clearInterval(spinInterval);

      // Final symbols
      const finalSyms = reels.length > 0
        ? Array.from({ length: reels.length }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
        : ['₿', '⭐', '🧱'];

      reels.forEach((r, i) => {
        r.classList.remove('spinning');
        r.textContent = finalSyms[i];
      });

      // Determine win
      const isWin = finalSyms[0] === finalSyms[1] || finalSyms[1] === finalSyms[2] || finalSyms[0] === finalSyms[2];
      const jackpot = finalSyms.every(s => s === finalSyms[0]);

      if (jackpot) {
        result.textContent = '🎰 JACKPOT! Token constellation unlocked!';
        result.className   = 'win';
      } else if (isWin) {
        result.textContent = '✨ Match! Research token minted.';
        result.className   = 'win';
      } else {
        result.textContent = 'Spin recorded — particle field updated.';
      }

      // Burst effect
      const slotEl = document.getElementById('slot-machine');
      const rect   = slotEl.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;

      const terms = ONTOLOGY_POOL[Math.floor(Math.random() * ONTOLOGY_POOL.length)];
      const burstCount = isWin ? (jackpot ? 800 : 450) : 200;

      if (window.QuantumField) {
        window.QuantumField.spinBurst(cx, cy, burstCount, terms);
      }

      // Spawn wave rings
      spawnWaveRings(isWin ? 4 : 2);

      // Create new token
      const winType = SYM_TYPE[finalSyms[0]] || 'research';
      const value   = Math.floor(500 + Math.random() * 3000);
      const newToken = createToken(winType, value, terms, finalSyms.join(''));

      // Add to network
      if (window.TokenNetwork) {
        window.TokenNetwork.addToken(newToken);
      }

      // Add to feed
      addFeedItem(newToken);

      // Update stats
      tokenCount++;
      totalValue += value;
      updateStats();

      spinBtn.disabled = false;
    }, delay);
  }

  // ── Token factory ─────────────────────────────
  function createToken(type, value, terms, result) {
    const id = String(nextId++);
    const existing = window.TOKEN_DATA ? window.TOKEN_DATA.tokens : [];
    // pick up to 2 random links from existing tokens
    const linkPool = existing.slice(-6).map(t => t.id);
    const links = linkPool.filter(() => Math.random() > 0.5).slice(0, 2);

    const token = {
      id,
      type,
      value,
      date:   new Date().toISOString().slice(0, 10),
      links,
      terms,
      title:  `${type.charAt(0).toUpperCase() + type.slice(1)} Token ${id}`,
      spinId: `spin-${String(spinCount).padStart(4, '0')}`,
      source: `unifier:${id}`
    };

    if (window.TOKEN_DATA) {
      window.TOKEN_DATA.tokens.push(token);
    }
    return token;
  }

  // ── Feed ──────────────────────────────────────
  function addFeedItem(token) {
    const list = document.getElementById('feed-list');
    if (!list) return;

    const icon = TYPE_ICON[token.type] || '●';
    const time = new Date().toLocaleTimeString();

    const li = document.createElement('li');
    li.className = `feed-item ${token.type}`;
    li.innerHTML = `
      <span class="feed-icon">${icon}</span>
      <span class="feed-text">${token.type} token <strong>${token.id}</strong> created · ${token.terms.slice(0, 2).join(', ')}</span>
      <span class="feed-time">${time}</span>
    `;
    list.prepend(li);

    // Keep feed manageable
    while (list.children.length > 20) {
      list.removeChild(list.lastChild);
    }
  }

  // ── Stats ─────────────────────────────────────
  function updateStats() {
    const el = id => document.getElementById(id);
    if (el('stat-spins'))   el('stat-spins').textContent   = spinCount;
    if (el('stat-tokens'))  el('stat-tokens').textContent  = tokenCount;
    if (el('stat-value'))   el('stat-value').textContent   = totalValue.toLocaleString();
    if (el('stat-nodes'))   el('stat-nodes').textContent   =
      window.TokenNetwork ? window.TokenNetwork.getNodeCount() : tokenCount;
  }

  // ── Wave rings ────────────────────────────────
  function spawnWaveRings(count) {
    const overlay = document.getElementById('wave-overlay');
    if (!overlay) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const ring = document.createElement('div');
        ring.className = 'wave-ring';
        overlay.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove());
      }, i * 220);
    }
  }

  // expose spin for tests
  window.SlotMachine = { spin, spinCount: () => spinCount };
}());
