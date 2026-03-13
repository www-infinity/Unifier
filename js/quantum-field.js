/**
 * quantum-field.js
 * Full-screen canvas particle field.
 * Particles drift, pulse, and react when a spin occurs.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('qf-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let particles = [];
  let animId;

  // ── Resize ────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Particle factory ─────────────────────────
  function makeParticle(opts) {
    opts = opts || {};
    return {
      x:      opts.x !== undefined ? opts.x : Math.random() * W,
      y:      opts.y !== undefined ? opts.y : Math.random() * H,
      vx:     opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * 0.6,
      vy:     opts.vy !== undefined ? opts.vy : (Math.random() - 0.5) * 0.6,
      radius: opts.radius || (Math.random() * 1.5 + 0.5),
      alpha:  opts.alpha  || (Math.random() * 0.5 + 0.2),
      color:  opts.color  || randomColor(),
      life:   opts.life   !== undefined ? opts.life : Infinity,
      born:   Date.now(),
      term:   opts.term   || null,
      energy: opts.energy || 0
    };
  }

  const COLORS = ['#00e5ff', '#a855f7', '#f5c518', '#ff6b35', '#22c55e', '#3b82f6'];
  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  // Seed the field
  function seedField(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(makeParticle());
    }
  }
  seedField(120);

  // ── Draw connections ─────────────────────────
  function drawConnections() {
    const max = 140;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < max) {
          const opacity = (1 - dist / max) * 0.12;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  // ── Update + draw particles ───────────────────
  function updateParticles() {
    const now = Date.now();
    particles = particles.filter(p => {
      if (p.life !== Infinity && now - p.born > p.life) return false;
      return true;
    });

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // bounce
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      // slow drift for burst particles
      if (p.energy > 0) {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      // fade out if life-limited
      if (p.life !== Infinity) {
        const age  = now - p.born;
        const frac = age / p.life;
        p.alpha = Math.max(0, (1 - frac) * 0.85);
      }
    });
  }

  // ── Render loop ───────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);

    updateParticles();
    drawConnections();

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(p.color, p.alpha);
      ctx.fill();
    });

    animId = requestAnimationFrame(render);
  }
  render();

  // ── Public API ────────────────────────────────
  /**
   * spinBurst(cx, cy, count, termList)
   * Emits burst particles from centre coords.
   * Called by slot-machine on each spin.
   */
  window.QuantumField = {
    spinBurst(cx, cy, count, termList) {
      count = count || 300;
      termList = termList || [];
      for (let i = 0; i < count; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const speed  = Math.random() * 5 + 1;
        const term   = termList[Math.floor(Math.random() * termList.length)] || null;
        const energy = Math.random();
        particles.push(makeParticle({
          x:      cx,
          y:      cy,
          vx:     Math.cos(angle) * speed,
          vy:     Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 0.5,
          alpha:  0.85,
          color:  randomColor(),
          life:   1200 + Math.random() * 1800,
          term,
          energy
        }));
      }
    }
  };

  // ── Helpers ───────────────────────────────────
  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}());
