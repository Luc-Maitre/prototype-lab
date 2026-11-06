// Labo « Page turn » : l'écran orange se tourne depuis le coin inférieur droit et révèle l'écran suivant.
//
// Géométrie : le coin P = (375, 812) est tiré en C. Le pli est la médiatrice de [P, C] (le papier se replie
// de P vers C). La page du dessus est découpée du côté de l'origine ; la partie découpée est retournée
// (symétrie axiale autour du pli) et dessinée en orange foncé : c'est le dos de la page.
// Au repos, C = (311, 748) : le petit coin replié de 64 px de la maquette.
// Interaction : tirer le coin, ou le toucher, ou « Tourner » ; relâcher au-delà d'un seuil termine le tour.
// URL : ?v=diagonale|livre|souleve  ?duree=900  ?motion (ignore « réduire les animations »)

(() => {
  const W = 375, H = 812;
  const P = [W, H];
  const REST = [W - 64, H - 64];      // coin replié de la maquette
  const END = [-W - 10, -H - 10];     // coin tiré hors écran : la page est entièrement tournée
  const RADIUS = 12.5;                // rayon du coin arrondi du dos (maquette)
  const RECT = [[0, 0], [W, 0], [W, H], [0, H]];

  // ---------- Trajectoires : comment le coin va de REST à END ----------
  // fx / fy = avancement en x et en y selon la progression u (0 → 1) : décalés, ils changent l'angle du pli.
  const out = (u) => 1 - (1 - u) ** 2;
  const inn = (u) => u * u;
  const VARIANTS = {
    diagonale: { nom: "Diagonale", note: "Le coin file vers le coin opposé : pli à 45°", fx: (u) => u, fy: (u) => u },
    livre:     { nom: "Livre",     note: "Le coin part vers la gauche : pli presque vertical", fx: out, fy: inn },
    souleve:   { nom: "Soulevé",   note: "Le coin monte d'abord : pli presque horizontal", fx: inn, fy: out },
  };

  const params = new URLSearchParams(location.search);
  const state = {
    variant: VARIANTS[params.get("v")] ? params.get("v") : "diagonale",
    duree: Number(params.get("duree")) || 900,
    turned: false,   // la page est-elle tournée ?
    C: [...REST],
    drag: null,
    anim: null,
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches && !params.has("motion");

  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  const bar = document.getElementById("bar");
  const elA = document.getElementById("pt-a");
  const elShade = document.getElementById("pt-a-shade");
  const elFlap = document.getElementById("pt-flap");
  if (params.has("bare")) bar.hidden = true;

  const fit = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fit);
  fit();

  // Écran suivant : le fond d'horloges, avec sa physique
  window.ShapesPhysics.init();
  window.ShapesPhysics.setVariant("clocks", { transition: false });

  // ---------- Géométrie ----------
  // Garde les points de `poly` où g(p) >= 0 (Sutherland–Hodgman).
  function clip(poly, g) {
    const res = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ga = g(a), gb = g(b);
      if (ga >= 0) res.push(a);
      if ((ga >= 0) !== (gb >= 0)) { const t = ga / (ga - gb); res.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return res;
  }
  const f = (v) => v.toFixed(2);
  const polygon = (pts) => `polygon(${pts.map(([x, y]) => `${f(x)}px ${f(y)}px`).join(",")})`;

  // Contour du dos de la page, avec le coin P arrondi (il devient le coin tiré une fois retourné).
  function roundedPath(pts) {
    let d = "";
    pts.forEach((v, i) => {
      const prev = pts[(i + pts.length - 1) % pts.length], next = pts[(i + 1) % pts.length];
      if (Math.hypot(v[0] - P[0], v[1] - P[1]) < 0.01) {
        const toward = (o) => { const l = Math.hypot(o[0] - v[0], o[1] - v[1]); const r = Math.min(RADIUS, l / 2); return [v[0] + (o[0] - v[0]) / l * r, v[1] + (o[1] - v[1]) / l * r]; };
        const a = toward(prev), b = toward(next);
        d += `${i ? "L" : "M"}${f(a[0])} ${f(a[1])}Q${f(v[0])} ${f(v[1])} ${f(b[0])} ${f(b[1])}`;
      } else d += `${i ? "L" : "M"}${f(v[0])} ${f(v[1])}`;
    });
    return `path("${d}Z")`;
  }

  // Dégradé le long de la normale, calé sur la position du pli : stops = [[distance au pli en px, couleur], …]
  function ramp(n, M, stops) {
    const angle = Math.atan2(n[0], -n[1]) * 180 / Math.PI;
    const L = Math.abs(W * Math.sin(angle * Math.PI / 180)) + Math.abs(H * Math.cos(angle * Math.PI / 180));
    const tFold = (M[0] - W / 2) * n[0] + (M[1] - H / 2) * n[1] + L / 2;
    return `linear-gradient(${angle.toFixed(2)}deg,${stops.map(([d, c]) => `${c} ${f(tFold + d)}px`).join(",")})`;
  }

  function render() {
    const C = state.C;
    const dx = P[0] - C[0], dy = P[1] - C[1], len = Math.hypot(dx, dy);
    if (len < 0.5) { elA.hidden = false; elFlap.hidden = true; elA.style.clipPath = "none"; elShade.style.background = "none"; return; }
    const n = [dx / len, dy / len];                     // du coin tiré vers P
    const M = [(P[0] + C[0]) / 2, (P[1] + C[1]) / 2];   // un point du pli
    const d = (q) => (q[0] - M[0]) * n[0] + (q[1] - M[1]) * n[1]; // > 0 côté P (partie repliée)

    const keep = clip(RECT, (q) => -d(q));
    const cut = clip(RECT, d);
    elA.hidden = keep.length < 3;
    elFlap.hidden = cut.length < 3;
    if (keep.length >= 3) {
      elA.style.clipPath = polygon(keep);
      elShade.style.background = ramp(n, M, [[-70, "rgba(21,34,51,0)"], [0, "rgba(21,34,51,.14)"]]); // ombre contre le pli
    }
    if (cut.length >= 3) {
      const k = 2 * (M[0] * n[0] + M[1] * n[1]);
      elFlap.style.clipPath = roundedPath(cut);
      elFlap.style.transform = `matrix(${1 - 2 * n[0] * n[0]},${-2 * n[0] * n[1]},${-2 * n[0] * n[1]},${1 - 2 * n[1] * n[1]},${f(k * n[0])},${f(k * n[1])})`;
      elFlap.style.backgroundImage = ramp(n, M, [[0, "rgba(21,34,51,.16)"], [90, "rgba(21,34,51,0)"]]); // dos plus sombre vers le pli
    }
  }

  // ---------- Animation ----------
  const bez = (x1, y1, x2, y2) => (x) => {
    const b = (a, c, t) => 3 * a * t * (1 - t) ** 2 + 3 * c * t * t * (1 - t) + t ** 3;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (b(x1, x2, t) < x) lo = t; else hi = t; }
    return b(y1, y2, t);
  };
  const ease = bez(0.4, 0, 0.2, 1); // départ progressif, arrivée douce

  // from → to avec le décalage x/y propre à la variante ; reverse = trajet inverse de la même courbe
  function run(from, to, { reverse = false, duration = state.duree, then } = {}) {
    cancelAnimationFrame(state.anim);
    const v = VARIANTS[state.variant];
    const t0 = performance.now();
    const dur = reduced ? 1 : duration;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const u = ease(t);
      state.C = reverse
        ? [to[0] + (from[0] - to[0]) * v.fx(1 - u), to[1] + (from[1] - to[1]) * v.fy(1 - u)]
        : [from[0] + (to[0] - from[0]) * v.fx(u), from[1] + (to[1] - from[1]) * v.fy(u)];
      if (t < 1) state.anim = requestAnimationFrame(tick);
      else { state.anim = 0; state.C = [...to]; then?.(); }
    };
    state.anim = requestAnimationFrame(tick);
  }

  function turn() {
    if (state.turned || state.drag) return;
    run(state.C, END, { then: () => { state.turned = true; sync(); } });
  }
  function back() {
    if (!state.turned && !state.anim) return;
    state.turned = false;
    run(REST, END, { reverse: true, then: sync });
  }
  // Petit retour au repos après un geste annulé
  function settle() {
    const from = [...state.C];
    run(from, REST, { duration: 350 });
  }

  // ---------- Geste : tirer le coin ----------
  function toLayer(e) {
    const r = stage.getBoundingClientRect();
    const s = r.width / W;
    return [(e.clientX - r.left) / s, (e.clientY - r.top) / s];
  }
  app.addEventListener("pointerdown", (e) => {
    if (state.turned) return;
    const p = toLayer(e);
    if (Math.hypot(p[0] - P[0], p[1] - P[1]) > 130) return; // on saisit le coin, pas n'importe où
    cancelAnimationFrame(state.anim); state.anim = 0;
    state.drag = { off: [p[0] - state.C[0], p[1] - state.C[1]], start: p, moved: 0, last: [p[0], p[1], performance.now()], v: [0, 0] };
    app.setPointerCapture(e.pointerId);
  });
  app.addEventListener("pointermove", (e) => {
    const g = state.drag;
    if (!g) return;
    const p = toLayer(e), now = performance.now();
    const dt = Math.max(1, now - g.last[2]);
    g.v = [(p[0] - g.last[0]) / dt, (p[1] - g.last[1]) / dt];
    g.last = [p[0], p[1], now];
    g.moved = Math.max(g.moved, Math.hypot(p[0] - g.start[0], p[1] - g.start[1]));
    state.C = [Math.min(W, p[0] - g.off[0]), Math.min(H, p[1] - g.off[1])];
  });
  const release = () => {
    const g = state.drag;
    if (!g) return;
    state.drag = null;
    const pulled = Math.hypot(P[0] - state.C[0], P[1] - state.C[1]);
    if (g.moved < 6) return turn();                                   // simple tap sur le coin
    if (pulled > 230 || g.v[0] < -0.8 || g.v[1] < -0.8) {             // assez tiré, ou lancé d'un geste
      run(state.C, END, { duration: state.duree * 0.7, then: () => { state.turned = true; sync(); } });
    } else settle();
  };
  app.addEventListener("pointerup", release);
  app.addEventListener("pointercancel", release);

  // ?c=x,y : fige le coin tiré à cette position (captures, comparaisons)
  const pin = (params.get("c") || "").split(",").map(Number);
  const pinned = pin.length === 2 && pin.every(Number.isFinite);
  if (pinned) state.C = pin;

  // Au repos le coin « respire » un peu pour inviter à le tirer
  function idle(now) {
    if (!pinned && !state.anim && !state.drag && !state.turned && !reduced) {
      const k = 3 * Math.sin(now / 700);
      state.C = [REST[0] + k, REST[1] + k];
    }
    render();
    requestAnimationFrame(idle);
  }
  requestAnimationFrame(idle);

  // ---------- Barre ----------
  function sync() {
    bar.querySelectorAll("button[data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === state.variant)));
    const toggle = bar.querySelector("[data-act=toggle]");
    if (toggle) toggle.textContent = state.turned ? "Revenir" : "Tourner la page";
    history.replaceState(null, "", `?v=${state.variant}${params.has("duree") ? `&duree=${state.duree}` : ""}`);
  }
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Page turn</h1>
    ${Object.entries(VARIANTS).map(([id, v]) => `<button type="button" data-v="${id}">${v.nom}<small>${v.note}</small></button>`).join("")}
    <label>Durée (ms)<input id="in-duree" type="number" min="200" step="100" value="${state.duree}"></label>
    <button type="button" class="replay" data-act="toggle">Tourner la page</button>
    <p class="hint">Tire le coin en bas à droite, ou touche-le.</p>`;
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v) { // changer de trajectoire rejoue le tour depuis le repos
      cancelAnimationFrame(state.anim); state.anim = 0;
      state.variant = b.dataset.v; state.turned = false; state.C = [...REST]; sync(); turn();
    }
    if (b.dataset.act === "toggle") { if (state.turned) back(); else turn(); sync(); }
  });
  document.getElementById("in-duree").addEventListener("change", (e) => { state.duree = Math.max(200, Number(e.target.value) || 900); });
  addEventListener("keydown", (e) => {
    if (e.target.matches("input")) return;
    if (e.key === "ArrowRight") turn();
    if (e.key === "ArrowLeft") back();
  });
  sync();
})();
