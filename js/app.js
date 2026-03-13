/**
 * js/app.js
 * Bootstraps the Unifier application.
 * Loads token_network.json, stores it in window.TOKEN_DATA,
 * then fires the 'app:ready' event for all modules to consume.
 * Feed seeding and network initialisation is handled by assets/app.js.
 */
(function () {
  'use strict';

  fetch('./data/token_network.json')
    .then(r => r.json())
    .then(data => {
      window.TOKEN_DATA = data;
    })
    .catch(() => {
      window.TOKEN_DATA = { tokens: [], spins: [] };
    })
    .finally(() => {
      document.dispatchEvent(new Event('app:ready'));
    });
}());
