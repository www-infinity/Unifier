/**
 * token-network.js
 * Token constellation visualizer.
 *
 * Strategy:
 *   - If THREE.js is available (via CDN) → renders a 3-D WebGL constellation.
 *   - Otherwise → falls back to a 2-D canvas force-directed graph that works
 *     without any external dependencies.
 *
 * Public API:  TokenNetwork.addToken(tokenObj)
 *              TokenNetwork.getNodeCount()
 */
(function () {
  'use strict';

  const TYPE_COLOR_HEX = {
    research:  '#ff6b35',
    discovery: '#f5c518',
    economic:  '#22c55e',
    science:   '#a855f7',
    archive:   '#3b82f6'
  };

  const TYPE_COLOR_INT = {
    research:  0xff6b35,
    discovery: 0xf5c518,
    economic:  0x22c55e,
    science:   0xa855f7,
    archive:   0x3b82f6
  };

  const TYPE_ICON = {
    research:  '🧱',
    discovery: '⭐',
    economic:  '💲',
    science:   '🧬',
    archive:   '📜'
  };

  // Wait briefly for THREE (loaded via CDN, may arrive after script)
  function waitForThree(container, canvas, tries) {
    tries = tries || 0;
    if (typeof THREE !== 'undefined') {
      setup3D(container, canvas);
    } else if (tries < 30) {
      setTimeout(() => waitForThree(container, canvas, tries + 1), 100);
    } else {
      setup2D(container, canvas);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  3-D path (Three.js)
  // ══════════════════════════════════════════════════════════
  function setup3D(container, canvas) {
    const W = container.clientWidth  || 500;
    const H = container.clientHeight || 460;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const point = new THREE.PointLight(0x00e5ff, 1.2, 60);
    point.position.set(5, 5, 10);
    scene.add(point);

    const nodes = {};
    const edges = [];

    const tooltip   = document.getElementById('node-tooltip');
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2(9999, 9999);
    let   hoverId   = null;

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      if (tooltip) {
        tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
        tooltip.style.top  = (e.clientY - rect.top  - 10) + 'px';
      }
    });

    function createNode(token) {
      const radius = Math.max(0.25, token.value / 900);
      const color  = TYPE_COLOR_INT[token.type] || 0xffffff;
      const geo    = new THREE.SphereGeometry(radius, 20, 20);
      const mat    = new THREE.MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: 0.3, shininess: 80
      });
      const mesh = new THREE.Mesh(geo, mat);

      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 4 + Math.random() * 6;
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      mesh.userData.tokenId = token.id;
      scene.add(mesh);

      nodes[token.id] = {
        mesh,
        data: token,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        )
      };
    }

    function buildEdges() {
      edges.forEach(l => scene.remove(l));
      edges.length = 0;
      const ids = Object.keys(nodes);
      for (let i = 0; i < ids.length; i++) {
        const a = nodes[ids[i]];
        if (!a.data.links) continue;
        a.data.links.forEach(lid => {
          const b = nodes[lid];
          if (!b) return;
          const geo = new THREE.BufferGeometry().setFromPoints([
            a.mesh.position.clone(), b.mesh.position.clone()
          ]);
          const mat  = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.2 });
          const line = new THREE.Line(geo, mat);
          scene.add(line);
          edges.push(line);
        });
      }
    }

    function applyForces() {
      const ids = Object.keys(nodes);
      for (let i = 0; i < ids.length; i++) {
        const na = nodes[ids[i]];
        for (let j = i + 1; j < ids.length; j++) {
          const nb   = nodes[ids[j]];
          const diff = na.mesh.position.clone().sub(nb.mesh.position);
          const dist = Math.max(diff.length(), 0.5);
          const f    = diff.normalize().multiplyScalar(0.04 / (dist * dist));
          na.velocity.add(f);
          nb.velocity.sub(f);
        }
        na.velocity.add(na.mesh.position.clone().multiplyScalar(-0.002));
        na.velocity.multiplyScalar(0.92);
        na.mesh.position.add(na.velocity);
      }
    }

    function updateEdgeGeometries() {
      let idx = 0;
      const ids = Object.keys(nodes);
      for (let i = 0; i < ids.length; i++) {
        const a = nodes[ids[i]];
        if (!a.data.links) continue;
        a.data.links.forEach(lid => {
          if (!nodes[lid]) return;
          const b = nodes[lid];
          if (edges[idx]) {
            const pos = edges[idx].geometry.attributes.position;
            pos.setXYZ(0, a.mesh.position.x, a.mesh.position.y, a.mesh.position.z);
            pos.setXYZ(1, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
            pos.needsUpdate = true;
          }
          idx++;
        });
      }
    }

    function checkHover() {
      if (!tooltip) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(nodes).map(n => n.mesh));
      if (hits.length > 0) {
        const id = hits[0].object.userData.tokenId;
        if (id !== hoverId) {
          hoverId = id;
          const t = nodes[id].data;
          tooltip.innerHTML = buildTooltipHTML(t);
          tooltip.classList.add('visible');
        }
        canvas.style.cursor = 'pointer';
      } else {
        hoverId = null;
        tooltip.classList.remove('visible');
        canvas.style.cursor = 'default';
      }
    }

    function seedNodes() {
      if (window.TOKEN_DATA && window.TOKEN_DATA.tokens) {
        window.TOKEN_DATA.tokens.forEach(t => createNode(t));
        buildEdges();
      }
    }
    document.addEventListener('app:ready', seedNodes);
    if (window.TOKEN_DATA) seedNodes();

    let autoRotate = 0;
    let mouseDown = false, lastMX = 0;
    canvas.addEventListener('mousedown', e => { e.preventDefault(); mouseDown = true; lastMX = e.clientX; });
    window.addEventListener('mouseup',   () => { mouseDown = false; });
    canvas.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      autoRotate += (e.clientX - lastMX) * 0.005;
      lastMX = e.clientX;
    });

    window.addEventListener('resize', () => {
      const W2 = container.clientWidth;
      const H2 = container.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });

    (function animate() {
      requestAnimationFrame(animate);
      autoRotate += 0.003;
      camera.position.x = Math.sin(autoRotate) * 18;
      camera.position.z = Math.cos(autoRotate) * 18;
      camera.lookAt(0, 0, 0);
      applyForces();
      updateEdgeGeometries();
      checkHover();
      renderer.render(scene, camera);
    }());

    window.TokenNetwork = {
      addToken(token) {
        if (nodes[token.id]) return;
        createNode(token);
        buildEdges();
      },
      getNodeCount() { return Object.keys(nodes).length; }
    };
  }

  // ══════════════════════════════════════════════════════════
  //  2-D canvas fallback (pure JS, no external deps)
  // ══════════════════════════════════════════════════════════
  function setup2D(container, canvas) {
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
      W = canvas.width  = container.clientWidth  || 500;
      H = canvas.height = container.clientHeight || 460;
    }
    resize();
    window.addEventListener('resize', resize);

    const nodes  = {};  // id → { x, y, vx, vy, data, r }
    const edges  = [];  // { a, b }

    const tooltip = document.getElementById('node-tooltip');
    let   hoverId = null;
    let   mouseX  = -1, mouseY = -1;

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      if (tooltip) {
        tooltip.style.left = (mouseX + 14) + 'px';
        tooltip.style.top  = (mouseY - 10) + 'px';
      }
    });
    canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

    function addNode(token) {
      if (nodes[token.id]) return;
      const r = Math.max(6, token.value / 300);
      nodes[token.id] = {
        x:  W / 2 + (Math.random() - 0.5) * W * 0.6,
        y:  H / 2 + (Math.random() - 0.5) * H * 0.6,
        vx: 0, vy: 0,
        r,
        data: token
      };
    }

    function buildEdges() {
      edges.length = 0;
      Object.values(nodes).forEach(na => {
        if (!na.data.links) return;
        na.data.links.forEach(lid => {
          const nb = nodes[lid];
          if (nb) edges.push({ a: na.data.id, b: lid });
        });
      });
    }

    function applyForces() {
      const ids = Object.keys(nodes);
      const cx  = W / 2, cy = H / 2;

      for (let i = 0; i < ids.length; i++) {
        const na = nodes[ids[i]];
        // repulsion
        for (let j = i + 1; j < ids.length; j++) {
          const nb = nodes[ids[j]];
          const dx = na.x - nb.x, dy = na.y - nb.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = 1200 / (dist * dist);
          const fx = (dx / dist) * f, fy = (dy / dist) * f;
          na.vx += fx; na.vy += fy;
          nb.vx -= fx; nb.vy -= fy;
        }
        // edge attraction
        edges.forEach(e => {
          if (e.a !== ids[i] && e.b !== ids[i]) return;
          const other = nodes[e.a === ids[i] ? e.b : e.a];
          if (!other) return;
          const dx = other.x - na.x, dy = other.y - na.y;
          na.vx += dx * 0.004;
          na.vy += dy * 0.004;
        });
        // gravity to centre
        na.vx += (cx - na.x) * 0.001;
        na.vy += (cy - na.y) * 0.001;

        na.vx *= 0.85; na.vy *= 0.85;
        na.x  += na.vx; na.y  += na.vy;

        // clamp
        na.x = Math.max(na.r + 4, Math.min(W - na.r - 4, na.x));
        na.y = Math.max(na.r + 4, Math.min(H - na.r - 4, na.y));
      }
    }

    function checkHover() {
      if (mouseX < 0) { hoverId = null; return; }
      let found = null;
      Object.values(nodes).forEach(n => {
        const dx = n.x - mouseX, dy = n.y - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) < n.r + 4) found = n.data.id;
      });
      if (found !== hoverId) {
        hoverId = found;
        if (tooltip) {
          if (found) {
            tooltip.innerHTML = buildTooltipHTML(nodes[found].data);
            tooltip.classList.add('visible');
          } else {
            tooltip.classList.remove('visible');
          }
        }
      }
      canvas.style.cursor = found ? 'pointer' : 'default';
    }

    let angle = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Slow rotation effect (shift origin)
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.sin(angle * 0.3) * 0.015);
      ctx.translate(-W / 2, -H / 2);
      angle += 0.008;

      // Edges
      edges.forEach(e => {
        const na = nodes[e.a], nb = nodes[e.b];
        if (!na || !nb) return;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Nodes
      Object.values(nodes).forEach(n => {
        const color   = TYPE_COLOR_HEX[n.data.type] || '#ffffff';
        const isHover = n.data.id === hoverId;

        // glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        grd.addColorStop(0, color + '55');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // main circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, isHover ? n.r * 1.2 : n.r, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.shadowColor = color;
        ctx.shadowBlur  = isHover ? 18 : 8;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // icon label
        ctx.font = `${Math.max(10, n.r)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TYPE_ICON[n.data.type] || '●', n.x, n.y);

        // id label
        ctx.font      = '9px Courier New';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('#' + n.data.id, n.x, n.y + n.r + 10);
      });

      ctx.restore();
    }

    function seed2D() {
      if (window.TOKEN_DATA && window.TOKEN_DATA.tokens) {
        window.TOKEN_DATA.tokens.forEach(t => addNode(t));
        buildEdges();
      }
    }
    document.addEventListener('app:ready', seed2D);
    if (window.TOKEN_DATA) seed2D();

    (function loop() {
      requestAnimationFrame(loop);
      applyForces();
      checkHover();
      draw();
    }());

    window.TokenNetwork = {
      addToken(token) {
        if (nodes[token.id]) return;
        addNode(token);
        buildEdges();
      },
      getNodeCount() { return Object.keys(nodes).length; }
    };
  }

  // ── Shared tooltip builder ────────────────────
  function buildTooltipHTML(t) {
    return `
      <div class="tt-id">${TYPE_ICON[t.type] || '●'} Token ${t.id}</div>
      <div class="tt-title">${t.title || ''}</div>
      <div class="tt-type">${t.type} · ${t.date}</div>
      <div class="tt-terms">${(t.terms || []).join(', ')}</div>
      <div class="tt-spin">${t.spinId || ''}</div>
    `;
  }

  // ── Entry point ───────────────────────────────
  function init() {
    const container = document.getElementById('token-network');
    const canvas    = document.getElementById('network-canvas');
    if (!container || !canvas) { setTimeout(init, 100); return; }
    waitForThree(container, canvas, 0);
  }

  init();
}());
