/**
 * app.js
 * Bootstraps the Unifier application.
 * Loads token_network.json then initialises all modules.
 */
(function () {
  'use strict';

  // ── Load token data then fire DOMContentLoaded modules ──
  fetch('./data/token_network.json')
    .then(r => r.json())
    .then(data => {
      window.TOKEN_DATA = data;
    })
    .catch(() => {
      // fallback: empty dataset so the rest of the app still works
      window.TOKEN_DATA = { tokens: [], spins: [] };
    })
    .finally(() => {
      // Scripts are deferred so DOM is ready; just dispatch a custom event
      document.dispatchEvent(new Event('app:ready'));
    });

  // ── Seed initial feed entries from loaded data ───────────
  document.addEventListener('app:ready', () => {
    if (!window.TOKEN_DATA || !window.TOKEN_DATA.tokens) return;

    const list = document.getElementById('feed-list');
    if (!list) return;

    const typeIcon = {
      research:  '🧱',
      discovery: '⭐',
      economic:  '💲',
      science:   '🧬',
      archive:   '📜'
    };

    // Show last 5 tokens in feed on load
    window.TOKEN_DATA.tokens.slice(-5).reverse().forEach(t => {
      const li = document.createElement('li');
      li.className = `feed-item ${t.type}`;
      li.innerHTML = `
        <span class="feed-icon">${typeIcon[t.type] || '●'}</span>
        <span class="feed-text">${t.type} token <strong>${t.id}</strong> · ${(t.terms || []).slice(0, 2).join(', ')}</span>
        <span class="feed-time">${t.date}</span>
      `;
      list.appendChild(li);
    });
  });
}());
