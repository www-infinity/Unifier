/* =====================================================================
   Unifier — ∞ Unified Slot Machine + Token Wallet + Research Writer
   assets/app.js — spin logic, reel animation, research integration,
                   auth wiring, AI chat, token wallet, token network
   ===================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     SYMBOLS
  ------------------------------------------------------------------ */
  const SYMBOLS = [
    { emoji: "₿",  label: "BTC",    value: 3,  weight: 8 },
    { emoji: "💎", label: "DIAM",   value: 5,  weight: 6 },
    { emoji: "∞",  label: "INF",    value: 8,  weight: 5 },
    { emoji: "🧱", label: "BLOCK",  value: 4,  weight: 7 },
    { emoji: "⭐", label: "STAR",   value: 2,  weight: 10 },
    { emoji: "🍄", label: "MARIO",  value: 6,  weight: 5 },
    { emoji: "👑", label: "CROWN",  value: 7,  weight: 4 },
    { emoji: "🚀", label: "PUMP",   value: 9,  weight: 3 },
    { emoji: "💰", label: "BAG",    value: 4,  weight: 7 },
    { emoji: "🔥", label: "FIRE",   value: 3,  weight: 9 },
    { emoji: "🥇", label: "GOLD",   value: 10, weight: 2 },
    { emoji: "🌕", label: "MOON",   value: 6,  weight: 5 },
  ];

  const REEL_COUNT    = 5;
  const SYMBOL_HEIGHT = 160;

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  let spinCount    = 0;
  let totalScore   = 0;
  let isSpinning   = false;
  let sessionHistory = [];
  let lastArticle  = null;
  let cfg = { owner: "www-infinity", repo: "Unifier", branch: "main" };
  let nextTokenId  = 2100;

  /* ------------------------------------------------------------------
     DOM REFS
  ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const strips         = Array.from({ length: REEL_COUNT }, (_, i) => $(`strip${i}`));
  const spinBtn        = $("spinBtn");
  const spinCounterEl  = $("spinCounter");
  const scoreCounterEl = $("scoreCounter");
  const resultBar      = $("resultBar");
  const resultText     = $("resultText");
  const consoleLog     = $("consoleLog");
  const historyEl      = $("history");
  const histCountEl    = $("histCount");
  const winOverlay     = $("winOverlay");
  const lever          = $("lever");
  const chatInput      = $("chatInput");

  /* ------------------------------------------------------------------
     WEIGHTED RANDOM SYMBOL PICK
  ------------------------------------------------------------------ */
  const totalWeight = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  function pickSymbol() {
    let r = Math.random() * totalWeight;
    for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  /* ------------------------------------------------------------------
     REEL INIT
  ------------------------------------------------------------------ */
  function buildStrip(stripEl) {
    stripEl.innerHTML = "";
    for (let i = 0; i < 24; i++) {
      const sym = pickSymbol();
      const div = document.createElement("div");
      div.className = "reel-symbol";
      div.innerHTML = `<span>${sym.emoji}</span><span class="sym-label">${sym.label}</span>`;
      stripEl.appendChild(div);
    }
  }
  function initReels() { strips.forEach((s) => buildStrip(s)); }

  /* ------------------------------------------------------------------
     SPIN ANIMATION
  ------------------------------------------------------------------ */
  function animateReel(reelEl, stripEl, finalSymbol, delay, duration) {
    return new Promise((resolve) => {
      setTimeout(() => {
        stripEl.innerHTML = "";
        const count = 20;
        for (let i = 0; i < count; i++) {
          const sym = i === count - 1 ? finalSymbol : pickSymbol();
          const div = document.createElement("div");
          div.className = "reel-symbol";
          div.innerHTML = `<span>${sym.emoji}</span><span class="sym-label">${sym.label}</span>`;
          stripEl.appendChild(div);
        }
        const farY = (count - 2) * SYMBOL_HEIGHT;
        stripEl.style.transition = "none";
        stripEl.style.transform = `translateY(${farY}px)`;
        void stripEl.offsetHeight;
        stripEl.style.transition = `transform ${duration}ms cubic-bezier(.17,.67,.35,1.05)`;
        const endY = -(count - 1) * SYMBOL_HEIGHT;
        stripEl.style.transform = `translateY(${endY}px)`;

        let settled = false;
        function settleReel() {
          if (settled) return; settled = true;
          stripEl.innerHTML = "";
          const d = document.createElement("div");
          d.className = "reel-symbol";
          d.innerHTML = `<span>${finalSymbol.emoji}</span><span class="sym-label">${finalSymbol.label}</span>`;
          stripEl.appendChild(d);
          stripEl.style.transition = "none";
          stripEl.style.transform = "translateY(0)";
          reelEl.classList.remove("spinning");
          resolve();
        }
        stripEl.addEventListener("transitionend", settleReel, { once: true });
        setTimeout(settleReel, duration + 500);
      }, delay);
    });
  }

  /* ------------------------------------------------------------------
     EVALUATE RESULT
  ------------------------------------------------------------------ */
  function evaluate(symbols) {
    const counts = {};
    symbols.forEach((s) => { counts[s.label] = (counts[s.label] || 0) + 1; });
    const max   = Math.max(...Object.values(counts));
    const total = symbols.reduce((a, s) => a + s.value, 0);
    if (max === 5) return { tier: "jackpot",    label: "🎰 JACKPOT! ALL MATCH!",     score: total * 50 };
    if (max === 4) return { tier: "win-big",    label: "💎 MEGA WIN — 4 of a kind!", score: total * 12 };
    if (max === 3) return { tier: "win-medium", label: "⭐ BIG WIN — 3 of a kind!",  score: total * 5  };
    if (max === 2) return { tier: "win-small",  label: "✅ WIN — pair found!",        score: total * 2  };
    return           { tier: "lose",          label: "🔄 No match. Spin again.",     score: 0          };
  }

  /* ------------------------------------------------------------------
     AUTH TOKEN
  ------------------------------------------------------------------ */
  function getAuthToken() { return (window.BITCOIN_CRUSHER_TOKEN || "").trim(); }

  /* ------------------------------------------------------------------
     GITHUB API — TRIGGER SAVE-SPIN WORKFLOW
  ------------------------------------------------------------------ */
  async function commitSpinRecord(spinData) {
    const token = getAuthToken();
    const { owner, repo, branch } = cfg;
    if (!token || !owner || !repo) {
      log("⚠️  GHP secret not available — skipping repo commit (local spin only).", "warn");
      return null;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `spins/spin-${ts}.json`;
    if (!/^spins\/spin-[\dT-]+\.json$/.test(filename)) {
      log("❌ Invalid spin filename — aborting commit.", "err");
      return null;
    }
    const targetBranch = branch || "main";
    const dispatchUrl  = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/save-spin.yml/dispatches`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    try {
      log(`📡 Submitting spin → ${filename}`, "");
      const res = await fetch(dispatchUrl, {
        method: "POST", headers,
        body: JSON.stringify({
          ref: targetBranch,
          inputs: { spin_data: JSON.stringify(spinData, null, 2), filename },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        log(`❌ GitHub API error ${res.status}: ${err.message || res.statusText}`, "err");
        return null;
      }
      const actionsUrl = `https://github.com/${owner}/${repo}/actions`;
      log(`✅ Spin queued → ${filename} (workflow running…)`, "ok");
      return { sha: null, url: actionsUrl, filename };
    } catch (e) {
      log(`❌ Network error: ${e.message}`, "err");
      return null;
    }
  }

  /* ------------------------------------------------------------------
     COIN BURST
  ------------------------------------------------------------------ */
  function burstCoins(count = 6) {
    const machine = $("machine");
    const emojis = ["💰", "💎", "₿", "⭐", "🥇", "🪙"];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "coin-burst";
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = `${10 + Math.random() * 80}%`;
        el.style.top  = `${20 + Math.random() * 50}%`;
        machine.appendChild(el);
        el.addEventListener("animationend", () => el.remove(), { once: true });
      }, i * 80);
    }
  }

  /* ------------------------------------------------------------------
     LEVER
  ------------------------------------------------------------------ */
  function pullLever() {
    if (!lever) return;
    lever.classList.add("pulled");
    setTimeout(() => lever.classList.remove("pulled"), 500);
  }

  /* ------------------------------------------------------------------
     LOGGER
  ------------------------------------------------------------------ */
  function log(msg, type = "") {
    const ts   = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}\n`;
    if (type === "err")   consoleLog.innerHTML += `<span class="log-err">${escHtml(line)}</span>`;
    else if (type === "ok")   consoleLog.innerHTML += `<span class="log-ok">${escHtml(line)}</span>`;
    else if (type === "warn") consoleLog.innerHTML += `<span class="log-warn">${escHtml(line)}</span>`;
    else consoleLog.textContent += line;
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  /* ------------------------------------------------------------------
     RESEARCH PANEL — show preview after spin
  ------------------------------------------------------------------ */
  function renderResearchPreview(article) {
    const panel   = $("researchPanel");
    const preview = $("researchPreview");
    const meta    = $("researchPanelMeta");
    if (!panel || !preview || !article) return;
    meta.textContent = `IF: ${article.impactFactor} · ${(article.domains || []).slice(0, 2).join(", ").replace(/_/g, " ")}`;
    preview.innerHTML = `
      <div class="res-title">${escHtml(article.title)}</div>
      <div class="res-meta">
        <span>👥 ${escHtml((article.authors || []).join(", "))}</span>
        <span>📰 ${escHtml(article.journal)} (${article.year})</span>
        <span>DOI: ${escHtml(article.doi)}</span>
      </div>
      <div class="res-keywords">${(article.keywords || []).map((k) => `<span class="res-kw">${escHtml(k)}</span>`).join("")}</div>
      <div class="res-abstract">${escHtml(article.abstract)}</div>
    `;
    panel.style.display = "";
  }

  /* ------------------------------------------------------------------
     RESEARCH MODAL — show full article
  ------------------------------------------------------------------ */
  function showResearchModal(article) {
    if (!article) return;
    const body = $("researchModalBody");
    const extCtx = article.externalContext
      ? `<div class="res-section"><h4>🦆 DuckDuckGo Context <span class="res-source">(${escHtml(article.externalContext.source)})</span></h4>
          <p>${escHtml(article.externalContext.abstract)}</p>
          ${article.externalContext.url ? `<a class="res-link" href="${escHtml(article.externalContext.url)}" target="_blank" rel="noopener noreferrer">↗ Read more</a>` : ""}
          ${(article.externalContext.relatedTopics || []).length ? `<div class="res-related">${article.externalContext.relatedTopics.map((t) => `<span class="res-kw">${escHtml(t)}</span>`).join("")}</div>` : ""}
        </div>` : "";

    const archSrc = (article.archiveSources || []).length
      ? `<div class="res-section"><h4>🗄️ Archive.org Sources</h4>
          <ul class="res-refs">${article.archiveSources.map((s) => `<li><a class="res-link" href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.title || s.id)}</a>${s.description ? " — " + escHtml(s.description) : ""}</li>`).join("")}</ul>
        </div>` : "";

    body.innerHTML = `
      <div class="res-title-big">${escHtml(article.title)}</div>
      <div class="res-meta-big">
        <span>👥 ${escHtml((article.authors || []).join(", "))}</span>
        <span>📰 ${escHtml(article.journal)} ${article.year}</span>
        <span>IF: ${article.impactFactor}</span>
        <span>DOI: ${escHtml(article.doi)}</span>
        <span>Spin #${article.spinNumber} · Score: ${article.tokenValue}</span>
        ${article.searchEnriched ? '<span class="res-badge enriched">🌐 Search Enriched</span>' : ""}
      </div>
      <div class="res-keywords">${(article.keywords || []).map((k) => `<span class="res-kw">${escHtml(k)}</span>`).join("")}</div>
      <div class="res-section"><h4>Abstract</h4><p>${escHtml(article.abstract)}</p></div>
      <div class="res-section"><h4>1. Introduction</h4><p>${escHtml(article.introduction)}</p></div>
      <div class="res-section"><h4>2. Materials &amp; Methods</h4><p>${escHtml(article.methods)}</p></div>
      <div class="res-section"><h4>3. Results</h4><p>${escHtml(article.results)}</p></div>
      <div class="res-section"><h4>4. Discussion</h4><p>${escHtml(article.discussion)}</p></div>
      <div class="res-section"><h4>5. Conclusion</h4><p>${escHtml(article.conclusion)}</p></div>
      ${extCtx}${archSrc}
      <div class="res-section"><h4>References</h4>
        <ul class="res-refs">${(article.references || []).map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>
      </div>
    `;
    const overlay = $("researchOverlay");
    overlay.removeAttribute("aria-hidden");
    overlay.style.display = "flex";
  }

  function closeResearchModal() {
    const overlay = $("researchOverlay");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.display = "none";
  }

  /* ------------------------------------------------------------------
     TOKEN WALLET PANEL
  ------------------------------------------------------------------ */
  function renderWallet() {
    const walletBody = $("walletBody");
    const walletCount = $("walletCount");
    if (!walletBody) return;

    const user = window.AUTH ? window.AUTH.currentUser() : null;
    if (!user) {
      walletBody.innerHTML = '<p class="wallet-sign-in">🔐 <button class="btn btn-xs" id="walletSignInBtn">Sign in</button> to view your token wallet.</p>';
      const btn = $("walletSignInBtn");
      if (btn) btn.addEventListener("click", openLoginModal);
      if (walletCount) walletCount.textContent = "0 tokens";
      return;
    }

    const tokens = window.AUTH.getUserTokens(user.username);
    if (walletCount) walletCount.textContent = `${tokens.length} token${tokens.length !== 1 ? "s" : ""}`;

    if (!tokens.length) {
      walletBody.innerHTML = '<p class="wallet-empty">No tokens yet — spin to earn your first token!</p>';
      return;
    }

    const rows = tokens.slice().reverse().slice(0, 50).map((t) => `
      <div class="wallet-token">
        <div class="wallet-token-icon">${t.emoji || "🪙"}</div>
        <div class="wallet-token-info">
          <div class="wallet-token-title">${escHtml(t.title || t.tokenId || "Token")}</div>
          <div class="wallet-token-meta">${escHtml(t.type || "")} · Score: ${t.score || 0} · ${t.timestamp ? new Date(t.timestamp).toLocaleDateString() : ""}</div>
        </div>
        <div class="wallet-token-value">+${t.score || 0}</div>
      </div>
    `).join("");

    walletBody.innerHTML = rows;
  }

  /* ------------------------------------------------------------------
     EXPORT ALL SPINS
  ------------------------------------------------------------------ */
  function exportAllSpins() {
    if (!sessionHistory.length) { log("ℹ️  No spins to export yet.", "warn"); return; }
    if (window.RESEARCH && window.RESEARCH.downloadExport) {
      window.RESEARCH.downloadExport(sessionHistory);
      log(`📦 Exported ${sessionHistory.length} spin${sessionHistory.length !== 1 ? "s" : ""} as HTML report.`, "ok");
    }
  }

  /* ------------------------------------------------------------------
     DOWNLOAD RECEIPT
  ------------------------------------------------------------------ */
  function downloadReceipt(spinData, commitInfo, article) {
    const receipt = Object.assign({}, spinData, {
      receipt: true,
      commitFilename: commitInfo ? commitInfo.filename : null,
      commitSha:      commitInfo ? commitInfo.sha      : null,
      commitUrl:      commitInfo ? commitInfo.url      : null,
      researchArticle: article || null,
    });
    const blob = new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const ts   = new Date(spinData.timestamp).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const a    = document.createElement("a");
    a.href = url; a.download = `receipt-spin-${ts}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    log(`📥 Receipt downloaded: receipt-spin-${ts}.json`, "ok");
  }

  /* ------------------------------------------------------------------
     HISTORY RENDER
  ------------------------------------------------------------------ */
  function addHistoryItem(spinData, commitInfo, article) {
    sessionHistory.unshift({ spinData, commitInfo, article });
    histCountEl.textContent = `${sessionHistory.length} spin${sessionHistory.length !== 1 ? "s" : ""}`;

    const item      = document.createElement("div");
    const isJackpot = spinData.tier === "jackpot";
    const isWin     = spinData.tier !== "lose";
    item.className  = `hist-item${isJackpot ? " jackpot-item" : ""}`;

    const resultClass = isJackpot ? "jackpot" : isWin ? "win" : "";
    const commitHtml  = commitInfo
      ? commitInfo.sha
        ? `<div class="hist-commit">📝 <a href="${escHtml(commitInfo.url)}" target="_blank" rel="noreferrer">${escHtml(commitInfo.sha)}</a> — ${escHtml(commitInfo.filename)}</div>`
        : `<div class="hist-commit">📡 <a href="${escHtml(commitInfo.url)}" target="_blank" rel="noreferrer">queued</a> — ${escHtml(commitInfo.filename)}</div>`
      : `<div class="hist-commit" style="color:var(--muted2)">⚡ local only</div>`;

    const artSnippet = article
      ? `<div class="hist-research">🔬 ${escHtml(article.title.slice(0, 80))}${article.title.length > 80 ? "…" : ""}</div>`
      : "";

    item.innerHTML = `
      <div class="hist-symbols">${spinData.symbols.join(" ")}</div>
      <div class="hist-result ${resultClass}">${escHtml(spinData.result)}</div>
      <div class="hist-time">Spin #${spinData.spinNumber} · +${spinData.score} pts · ${new Date(spinData.timestamp).toLocaleTimeString()}</div>
      ${artSnippet}${commitHtml}
    `;

    const receiptBtn = document.createElement("button");
    receiptBtn.className   = "btn btn-xs btn-ghost hist-receipt-btn";
    receiptBtn.textContent = "📥 Receipt";
    receiptBtn.addEventListener("click", () => downloadReceipt(spinData, commitInfo, article));
    item.appendChild(receiptBtn);

    if (article) {
      const viewBtn = document.createElement("button");
      viewBtn.className   = "btn btn-xs btn-ghost hist-receipt-btn";
      viewBtn.textContent = "🔬 Research";
      viewBtn.addEventListener("click", () => showResearchModal(article));
      item.appendChild(viewBtn);
    }

    if (!historyEl.children.length) historyEl.appendChild(item);
    else historyEl.insertBefore(item, historyEl.firstChild);

    runAiAnalysis();
  }

  /* ------------------------------------------------------------------
     MAIN SPIN FUNCTION
  ------------------------------------------------------------------ */
  async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;

    pullLever();
    resultBar.className = "result-bar";
    resultText.textContent = "Spinning…";
    winOverlay.textContent = "";
    winOverlay.className   = "win-overlay";

    const finals = Array.from({ length: REEL_COUNT }, () => pickSymbol());

    const reelEls = Array.from({ length: REEL_COUNT }, (_, i) => $(`reel${i}`));
    reelEls.forEach((r) => r.classList.add("spinning"));

    const anims = finals.map((sym, i) =>
      animateReel(reelEls[i], strips[i], sym, i * 220, 900 + i * 320)
    );
    await Promise.all(anims);

    const res = evaluate(finals);
    spinCount++;
    totalScore += res.score;
    spinCounterEl.textContent  = spinCount;
    scoreCounterEl.textContent = totalScore;

    resultText.textContent = res.label;
    resultBar.classList.add(res.tier);

    if (res.tier !== "lose") {
      burstCoins(res.tier === "jackpot" ? 20 : res.tier === "win-big" ? 12 : 6);
      if (res.tier === "jackpot" || res.tier === "win-big") {
        winOverlay.textContent = res.tier === "jackpot" ? "🎰 JACKPOT! 🎰" : "💎 MEGA WIN! 💎";
        winOverlay.className   = "win-overlay show";
        setTimeout(() => { winOverlay.className = "win-overlay"; }, 2500);
      }
    }

    const timestamp = new Date().toISOString();
    const spinData  = {
      spinNumber : spinCount,
      timestamp,
      symbols    : finals.map((s) => s.emoji),
      labels     : finals.map((s) => s.label),
      result     : res.label,
      tier       : res.tier,
      score      : res.score,
      totalScore,
      deviceId   : deviceId ? deviceId.join("-") : "unknown",
      username   : window.AUTH ? (window.AUTH.currentUser()?.username || "guest") : "guest",
    };

    // Trigger quantum field burst
    if (window.QuantumField && window.QuantumField.spinBurst) {
      const machineEl = $("machine");
      const rect = machineEl ? machineEl.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      window.QuantumField.spinBurst(
        rect.left + rect.width / 2,
        rect.top  + rect.height / 2,
        res.tier === "jackpot" ? 600 : 200,
        []
      );
    }

    // Generate research article
    let article = null;
    if (window.RESEARCH) {
      try {
        article = await window.RESEARCH.generate(spinData, finals.map((s) => s.label));
        lastArticle = article;
        renderResearchPreview(article);
        log(`🔬 Research token generated: "${article.title}"`, "ok");
      } catch (e) {
        log(`⚠️  Research generation failed: ${e.message}`, "warn");
      }
    }

    // Commit to GitHub
    const commitInfo = await commitSpinRecord(spinData);

    // Save token to user wallet
    const user = window.AUTH ? window.AUTH.currentUser() : null;
    const tokenId = String(nextTokenId++);
    const tokenSummary = {
      tokenId,
      title     : article ? article.title : res.label,
      type      : finals[0].label.toLowerCase(),
      emoji     : finals[0].emoji,
      score     : res.score,
      tier      : res.tier,
      timestamp,
      spinNumber: spinCount,
    };

    if (user && window.AUTH) {
      window.AUTH.addTokenToUser(user.username, tokenSummary);
      window.AUTH.updateUserStats(user.username, spinCount, totalScore);
      renderWallet();
    }

    // Add to token network
    if (window.TokenNetwork) {
      const networkToken = {
        id        : tokenId,
        type      : ["research","discovery","economic","science","archive"][Math.floor(Math.random() * 5)],
        value     : 500 + res.score * 10,
        date      : new Date().toISOString().slice(0, 10),
        links     : [],
        terms     : article ? (article.keywords || []).slice(0, 3) : finals.map((s) => s.label.toLowerCase()),
        title     : article ? article.title : res.label,
        spinId    : `spin-${spinCount.toString().padStart(4, "0")}`,
        source    : "unifier",
      };
      window.TokenNetwork.addToken(networkToken);
    }

    // Update network stats
    if ($("stat-spins"))  $("stat-spins").textContent  = spinCount;
    if ($("stat-tokens")) $("stat-tokens").textContent = nextTokenId - 2100;
    if ($("stat-value"))  $("stat-value").textContent  = totalScore;
    if ($("stat-nodes") && window.TokenNetwork) $("stat-nodes").textContent = window.TokenNetwork.getNodeCount();

    // Add to feed
    addFeedItem(tokenSummary, article);

    addHistoryItem(spinData, commitInfo, article);
    log(`🎰 Spin #${spinCount}: ${finals.map((s) => s.emoji).join(" ")} → ${res.label} (+${res.score} pts)`, res.tier !== "lose" ? "ok" : "");

    isSpinning  = false;
    spinBtn.disabled = false;
  }

  /* ------------------------------------------------------------------
     TOKEN FEED
  ------------------------------------------------------------------ */
  function addFeedItem(tokenSummary, article) {
    const feedList = $("feed-list");
    if (!feedList) return;
    const li = document.createElement("li");
    li.className = "feed-item";
    li.innerHTML = `
      <span class="feed-icon">${tokenSummary.emoji}</span>
      <div class="feed-info">
        <div class="feed-title">${escHtml(tokenSummary.title.slice(0, 60))}${tokenSummary.title.length > 60 ? "…" : ""}</div>
        <div class="feed-meta">Token #${tokenSummary.tokenId} · ${tokenSummary.type} · +${tokenSummary.score} pts</div>
      </div>
    `;
    if (feedList.children.length >= 20) feedList.removeChild(feedList.lastChild);
    feedList.insertBefore(li, feedList.firstChild);
  }

  /* ------------------------------------------------------------------
     AI CHAT
  ------------------------------------------------------------------ */
  async function handleChat() {
    if (!chatInput) return;
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = "";

    const chatLog = $("chatLog");
    if (!chatLog) return;

    const userBubble = document.createElement("div");
    userBubble.className = "chat-msg user";
    userBubble.innerHTML = `<span class="chat-avatar">👤</span><span class="chat-bubble">${escHtml(msg)}</span>`;
    chatLog.appendChild(userBubble);

    const thinkBubble = document.createElement("div");
    thinkBubble.className = "chat-msg ai";
    thinkBubble.innerHTML = `<span class="chat-avatar">🤖</span><span class="chat-bubble">Searching research databases…</span>`;
    chatLog.appendChild(thinkBubble);
    chatLog.scrollTop = chatLog.scrollHeight;

    let aiReply = "";
    if (window.RESEARCH && window.RESEARCH.chatResponse) {
      try {
        aiReply = await window.RESEARCH.chatResponse(msg);
      } catch (e) {
        aiReply = `Error: ${e.message}`;
      }
    } else {
      // Basic fallback
      const topics = ["quantum", "bitcoin", "hydrogen", "plasma", "neural", "cosmic", "compression"];
      const hit = topics.find((t) => msg.toLowerCase().includes(t));
      aiReply = hit
        ? `I found research data on ${hit}. The field of ${hit} encompasses several cutting-edge disciplines including energy physics, computational theory, and applied materials science. Spin the slot machine to generate a detailed research token on this topic!`
        : `Great question! I am the Infinity Research AI. Ask me about quantum physics, blockchain technology, hydrogen energy, or any scientific topic. Try spinning the slot machine to generate research tokens linked to your query.`;
    }

    thinkBubble.querySelector(".chat-bubble").textContent = aiReply;
    chatLog.scrollTop = chatLog.scrollHeight;

    if (window.AUTH) {
      const user = window.AUTH.currentUser();
      if (user) window.AUTH.saveConversation(user.username, msg, aiReply).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------
     TICKER ANIMATION
  ------------------------------------------------------------------ */
  function animateTicker() {
    const ticker = $("ticker");
    if (!ticker) return;
    const msgs = [
      "INFINITY SYSTEM ACTIVE — CRUSHING BITCOIN — ∞ ∞ ∞",
      "UNIFYING ALL ACTIVE REPOS — BUILDING KNOWLEDGE GRAPH",
      "TOKEN WALLET LIVE — SIGN IN TO TRACK YOUR TOKENS",
      "RESEARCH WRITER ACTIVE — EVERY SPIN GENERATES AN ARTICLE",
      "QUANTUM FIELD ONLINE — PARTICLE BURST ON WIN",
    ];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % msgs.length;
      ticker.textContent = msgs[idx];
    }, 4000);
  }

  /* ------------------------------------------------------------------
     CONFIG
  ------------------------------------------------------------------ */
  const CFG_KEY = "bc_cfg_v1";

  function prefillFromRepoMeta() {
    if (cfg.owner && cfg.repo) return;
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical) {
      const m = canonical.href.match(/github\.io\/([^/]+)/);
      if (m) { cfg.repo = m[1]; cfg.owner = "www-infinity"; }
    }
  }

  function pushCfgToInputs() {
    const o = $("cfgOwner"), r = $("cfgRepo"), b = $("cfgBranch");
    if (o) o.value = cfg.owner || "";
    if (r) r.value = cfg.repo  || "";
    if (b) b.value = cfg.branch || "main";
    updateRepoLink();
  }

  function updateRepoLink() {
    const row  = $("repoLinkRow");
    const link = $("repoLink");
    if (!row || !link) return;
    if (cfg.owner && cfg.repo) {
      link.href = `https://github.com/${cfg.owner}/${cfg.repo}`;
      link.textContent = `🔗 ${cfg.owner}/${cfg.repo}`;
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  }

  function saveCfg() {
    const o = $("cfgOwner"), r = $("cfgRepo"), b = $("cfgBranch");
    cfg.owner  = (o ? o.value.trim() : "") || "www-infinity";
    cfg.repo   = (r ? r.value.trim() : "") || "Unifier";
    cfg.branch = (b ? b.value.trim() : "") || "main";
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    updateRepoLink();
    log(`✅ Config saved: ${cfg.owner}/${cfg.repo} @ ${cfg.branch}`, "ok");
  }

  function loadCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
      if (saved.owner) cfg.owner  = saved.owner;
      if (saved.repo)  cfg.repo   = saved.repo;
      if (saved.branch) cfg.branch = saved.branch;
    } catch (_) {}
    pushCfgToInputs();
  }

  function clearCfg() {
    localStorage.removeItem(CFG_KEY);
    cfg = { owner: "www-infinity", repo: "Unifier", branch: "main" };
    pushCfgToInputs();
    log("🗑️  Config cleared.", "warn");
  }

  /* ------------------------------------------------------------------
     DEVICE IDENTITY
  ------------------------------------------------------------------ */
  const IDENTITY_KEY = "bc_device_id_v1";
  let deviceId = [];

  function genBlock() {
    return Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function genDeviceId() {
    return Array.from({ length: 8 }, genBlock);
  }

  function renderDeviceId() {
    let id = null;
    try { id = JSON.parse(localStorage.getItem(IDENTITY_KEY)); } catch (_) {}
    if (!Array.isArray(id) || id.length !== 8) {
      id = genDeviceId();
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
    }
    deviceId = id;
    const blocks = $("identityBlocks");
    const meta   = $("identityMeta");
    if (blocks) blocks.textContent = id.join(" · ");
    const ts = localStorage.getItem(IDENTITY_KEY + "_ts") || new Date().toISOString();
    if (meta) meta.textContent = `Created: ${new Date(ts).toLocaleDateString()} — ${id.length * 4}-byte fingerprint`;
  }

  function wireIdentity() {
    const copyBtn  = $("btnCopyId");
    const regenBtn = $("btnRegenId");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(deviceId.join("-")).then(() => {
          copyBtn.textContent = "✅ Copied!";
          setTimeout(() => { copyBtn.textContent = "📋 Copy ID"; }, 1500);
        }).catch(() => { log("❌ Clipboard access denied.", "err"); });
      });
    }
    if (regenBtn) {
      regenBtn.addEventListener("click", () => {
        localStorage.removeItem(IDENTITY_KEY);
        localStorage.setItem(IDENTITY_KEY + "_ts", new Date().toISOString());
        renderDeviceId();
        log("🔄 Device ID regenerated.", "warn");
      });
    }
  }

  /* ------------------------------------------------------------------
     AI SIGNAL ANALYSIS
  ------------------------------------------------------------------ */
  function setAiStatus(dotClass, text) {
    const dot  = $("aiDot");
    const stat = $("aiStatusText");
    if (dot) { dot.className = "ai-dot" + (dotClass ? " " + dotClass : ""); }
    if (stat) stat.textContent = text;
  }

  function aiLog(msg) {
    const log = $("aiLog");
    if (!log) return;
    log.textContent += msg + "\n";
    log.scrollTop = log.scrollHeight;
  }

  function runAiAnalysis() {
    if (!sessionHistory.length) return;
    const tiers = sessionHistory.map((h) => h.spinData.tier);
    const wins  = tiers.filter((t) => t !== "lose").length;
    const rate  = (wins / tiers.length * 100).toFixed(1);
    const streak = (() => {
      let s = 0;
      for (const t of tiers) { if (t !== "lose") s++; else break; }
      return s;
    })();
    setAiStatus("active", `Analyzing ${tiers.length} spins…`);
    const pred = $("aiPrediction");
    if (pred) {
      pred.innerHTML = `
        <div class="ai-stat">Win Rate: <strong>${rate}%</strong></div>
        <div class="ai-stat">Current Streak: <strong>${streak}</strong></div>
        <div class="ai-stat">Total Spins: <strong>${tiers.length}</strong></div>
        <div class="ai-stat">Total Score: <strong>${totalScore}</strong></div>
      `;
    }
    aiLog(`[Spin ${spinCount}] win-rate=${rate}% streak=${streak} score=${totalScore}`);
    setAiStatus("active", `Win rate: ${rate}% · Streak: ${streak}`);
  }

  /* ------------------------------------------------------------------
     AUTH UI
  ------------------------------------------------------------------ */
  function updateAuthUI() {
    const user = window.AUTH ? window.AUTH.currentUser() : null;
    const badge     = $("userBadge");
    const badgeName = $("userBadgeName");
    const badgeRole = $("userBadgeRole");
    const loginBtn  = $("loginBtn");
    const adminPanel = $("adminPanel");

    if (user) {
      if (badge)    { badge.style.display = "flex"; }
      if (badgeName) badgeName.textContent = user.username;
      if (badgeRole) badgeRole.textContent = user.role === "admin" ? "⚙️ Admin" : "👤 User";
      if (loginBtn) loginBtn.style.display = "none";
      if (adminPanel && user.role === "admin") adminPanel.style.display = "";
      renderWallet();
    } else {
      if (badge)    badge.style.display = "none";
      if (loginBtn) loginBtn.style.display = "";
      if (adminPanel) adminPanel.style.display = "none";
      renderWallet();
    }
  }

  function openLoginModal() {
    const overlay = $("loginOverlay");
    overlay.removeAttribute("aria-hidden");
    overlay.style.display = "flex";
    const lu = $("loginUser");
    if (lu) lu.focus();
  }
  function closeLoginModal() {
    const overlay = $("loginOverlay");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.display = "none";
  }

  function wireAuth() {
    if (!window.AUTH) return;
    const overlay = $("loginOverlay");
    if (!overlay) return;

    const tabLogin    = $("tabLogin");
    const tabRegister = $("tabRegister");
    if (tabLogin) {
      tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        if (tabRegister) tabRegister.classList.remove("active");
        const lf = $("loginForm"), rf = $("registerForm");
        if (lf) lf.style.display = "";
        if (rf) rf.style.display = "none";
      });
    }
    if (tabRegister) {
      tabRegister.addEventListener("click", () => {
        tabRegister.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        const lf = $("loginForm"), rf = $("registerForm");
        if (lf) lf.style.display = "none";
        if (rf) rf.style.display = "";
        const ru = $("regUser"); if (ru) ru.focus();
      });
    }

    const loginBtn = $("loginBtn");
    const loginClose = $("loginClose");
    const logoutBtn  = $("logoutBtn");

    if (loginBtn)  loginBtn.addEventListener("click", openLoginModal);
    if (loginClose) loginClose.addEventListener("click", closeLoginModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLoginModal(); });

    const btnLogin = $("btnLogin");
    if (btnLogin) {
      btnLogin.addEventListener("click", async () => {
        const msg = $("loginMsg");
        if (msg) { msg.textContent = "Signing in…"; msg.className = "auth-msg"; }
        try {
          const u = await window.AUTH.login($("loginUser").value.trim(), $("loginPass").value);
          if (msg) { msg.textContent = `✅ Welcome back, ${u.username}!`; msg.className = "auth-msg ok"; }
          setTimeout(() => {
            closeLoginModal();
            updateAuthUI();
            log(`✅ Signed in as ${u.username} (${u.role}).`, "ok");
          }, 800);
        } catch (e) {
          if (msg) { msg.textContent = `❌ ${e.message}`; msg.className = "auth-msg err"; }
        }
      });
    }

    const btnRegister = $("btnRegister");
    if (btnRegister) {
      btnRegister.addEventListener("click", async () => {
        const msg = $("registerMsg");
        if (msg) { msg.textContent = "Creating account…"; msg.className = "auth-msg"; }
        try {
          const u = await window.AUTH.register(
            $("regUser").value.trim(),
            $("regEmail").value.trim(),
            $("regPass").value
          );
          if (msg) { msg.textContent = `✅ Account created! Welcome, ${u.username}!`; msg.className = "auth-msg ok"; }
          setTimeout(() => {
            closeLoginModal();
            updateAuthUI();
            log(`✅ Registered and signed in as ${u.username}.`, "ok");
          }, 800);
        } catch (e) {
          if (msg) { msg.textContent = `❌ ${e.message}`; msg.className = "auth-msg err"; }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        window.AUTH.logout();
        updateAuthUI();
        log("👋 Signed out.", "warn");
      });
    }

    // Enter key
    ["loginUser", "loginPass"].forEach((id) => {
      const el = $(id); if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = $("btnLogin"); if (b) b.click(); } });
    });
    ["regUser", "regEmail", "regPass"].forEach((id) => {
      const el = $(id); if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = $("btnRegister"); if (b) b.click(); } });
    });
  }

  /* ------------------------------------------------------------------
     HAMBURGER MENU
  ------------------------------------------------------------------ */
  function wireHamburger() {
    const hamBtn     = $("hamBtn");
    const hamDrawer  = $("hamDrawer");
    const hamOverlay = $("hamOverlay");
    const hamClose   = $("hamClose");
    if (!hamBtn || !hamDrawer) return;

    function openHam() {
      hamDrawer.classList.add("open");
      if (hamOverlay) hamOverlay.classList.add("visible");
      hamBtn.setAttribute("aria-expanded", "true");
      hamDrawer.removeAttribute("aria-hidden");
    }
    function closeHam() {
      hamDrawer.classList.remove("open");
      if (hamOverlay) hamOverlay.classList.remove("visible");
      hamBtn.setAttribute("aria-expanded", "false");
      hamDrawer.setAttribute("aria-hidden", "true");
    }
    hamBtn.addEventListener("click", openHam);
    if (hamClose) hamClose.addEventListener("click", closeHam);
    if (hamOverlay) hamOverlay.addEventListener("click", closeHam);
  }

  /* ------------------------------------------------------------------
     ADMIN PANEL
  ------------------------------------------------------------------ */
  function wireAdmin() {
    const btnSave  = $("btnSaveCfg");
    const btnLoad  = $("btnLoadCfg");
    const btnClear = $("btnClearCfg");
    if (btnSave)  btnSave.addEventListener("click",  saveCfg);
    if (btnLoad)  btnLoad.addEventListener("click",  loadCfg);
    if (btnClear) btnClear.addEventListener("click", clearCfg);
  }

  /* ------------------------------------------------------------------
     WIRE ALL EVENTS
  ------------------------------------------------------------------ */
  function wireEvents() {
    spinBtn.addEventListener("click", spin);
    if (lever) {
      lever.addEventListener("click", () => { if (!isSpinning) spin(); });
      const leverWrap = lever.closest(".lever-wrap");
      if (leverWrap) leverWrap.addEventListener("click", () => { if (!isSpinning) spin(); });
    }

    const clearLogBtn  = $("clearLog");
    const exportAllBtn = $("exportAllBtn");
    const viewResBtn   = $("viewResearchBtn");
    const resClose     = $("researchClose");
    const resOverlay   = $("researchOverlay");
    const chatSendBtn  = $("chatSendBtn");

    if (clearLogBtn)  clearLogBtn.addEventListener("click",  () => { consoleLog.textContent = ""; });
    if (exportAllBtn) exportAllBtn.addEventListener("click", exportAllSpins);
    if (viewResBtn)   viewResBtn.addEventListener("click",   () => { if (lastArticle) showResearchModal(lastArticle); });
    if (resClose)     resClose.addEventListener("click",     closeResearchModal);
    if (resOverlay)   resOverlay.addEventListener("click",   (e) => { if (e.target === resOverlay) closeResearchModal(); });
    if (chatSendBtn)  chatSendBtn.addEventListener("click",  handleChat);
    if (chatInput)    chatInput.addEventListener("keydown",  (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } });

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.target.matches("input,textarea,button,select")) {
        e.preventDefault();
        if (!isSpinning) spin();
      }
    });

    wireIdentity();
    wireAuth();
    wireHamburger();
    wireAdmin();
  }

  /* ------------------------------------------------------------------
     SEED FEED FROM EXISTING TOKEN DATA
  ------------------------------------------------------------------ */
  function seedFeed() {
    if (!window.TOKEN_DATA || !window.TOKEN_DATA.tokens) return;
    const tokens = window.TOKEN_DATA.tokens.slice(-5).reverse();
    tokens.forEach((t) => {
      addFeedItem({
        tokenId   : t.id,
        title     : t.title || `Token #${t.id}`,
        type      : t.type || "research",
        emoji     : { research: "🧱", discovery: "⭐", economic: "💲", science: "🧬", archive: "📜" }[t.type] || "🪙",
        score     : t.value || 0,
        tier      : "existing",
        timestamp : t.date,
        spinNumber: 0,
      }, null);
    });
  }

  /* ------------------------------------------------------------------
     INIT
  ------------------------------------------------------------------ */
  async function init() {
    prefillFromRepoMeta();
    loadCfg();
    pushCfgToInputs();
    initReels();
    animateTicker();
    wireEvents();

    if (!localStorage.getItem(IDENTITY_KEY + "_ts")) {
      localStorage.setItem(IDENTITY_KEY + "_ts", new Date().toISOString());
    }
    renderDeviceId();
    aiLog(`🪪 Device ID: ${deviceId.join(" ")}`);
    setAiStatus("", "Signal engine ready — awaiting spin data");

    if (window.AUTH) {
      await window.AUTH.ensureAdmin();
      updateAuthUI();
    }

    // Seed feed after data loads
    document.addEventListener("app:ready", seedFeed);

    log("⬡ UNIFIER — Infinity Slot Machine + Token Wallet ready.");
    log("🎰 Hit SPIN & CRUSH (or press Space) to generate a research token!");
    log("🔐 Sign in to save tokens to your wallet and build your profile.");
    if (getAuthToken() && cfg.owner && cfg.repo) {
      log(`✅ Repo: ${cfg.owner}/${cfg.repo} — GHP active, spins will be committed.`, "ok");
    } else {
      log("⚠️  No GHP secret — spins are local only.", "warn");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
