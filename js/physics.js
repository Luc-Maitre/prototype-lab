// Shapes de fond « physiques » pilotées par l'accéléromètre.
//
// Modèle : chaque shape est une masse reliée à sa position Figma par un ressort amorti.
// La gravité apparente mesurée par le téléphone (gravité + secousses) la pousse :
// incliner = elle glisse et roule vers le bas, secouer = elle rebondit, puis revient.
// Les shapes se chevauchent dans le design, donc pas de collisions entre elles.
//
// Desktop (pas de capteur) : la position de la souris simule l'inclinaison.
// Ajouter ?debug à l'URL pour voir l'état des capteurs.

(() => {
  const DATA = window.SHAPES;

  // Réglages par calque : gain = profondeur (l'arrière bouge moins), hz/zeta = ressort.
  const ROLES = {
    blue:   { gain: 0.55, hz: 0.75, zeta: 0.32 },
    orange: { gain: 0.8,  hz: 0.55, zeta: 0.26 },
    peach:  { gain: 1,    hz: 0.65, zeta: 0.22 },
  };
  
  const PX_PER_MS2 = 150;   // px design par m/s² de gravité apparente
  const SOFT_LIMIT = 80;    // px : au-delà, le ressort se raidit (les shapes restent à l'écran)
  const ROLL = 1;           // 1 = roulement sans glissement (angle = déplacement / rayon)
  const SWAY = 1;           // barres : angle = déplacement / hauteur (le sommet suit le corps)
  const SQUASH = [0.75, 1.25]; // barres : limites de tassement / étirement vertical
  const SMOOTH_TAU = 0.05;  // s : lissage du bruit capteur
  const BASELINE_TAU = 1.4; // s : recentrage vertical sur la tenue naturelle du téléphone
  // Houle ambiante : force douce et lente qui s'ajoute aux capteurs, pour que les shapes
  // ne soient jamais figées (même avant l'autorisation capteurs ou sans souris).
  const AMBIENT = { x: 1.4, y: 0.9 }; // m/s² (une inclinaison de ~8° ≈ 1.4 m/s²)
  const START_KICK = 140;   // px/s : impulsion initiale vers le haut, les shapes « se posent » au chargement

  const layer = document.getElementById("bg");
  const veil = layer.querySelector(".veil");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches && !new URLSearchParams(location.search).has("motion");

  // ---------- DOM ----------

  const variants = {};
  const bodies = {};
  let active = null;

  function build() {
    for (const [name, shapes] of Object.entries(DATA)) {
      const group = document.createElement("div");
      group.className = "bg-variant";
      group.dataset.variant = name;
      group.hidden = true;
      variants[name] = shapes.map((s, i) => {
        const el = document.createElement("div");
        el.className = "shape";
        el.style.cssText =
          `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;` +
          `transform-origin:${s.cx - s.x}px ${s.cy - s.y}px;--i:${i}`; // --i : décalage des animations d'entrée
        el.innerHTML = s.svg;
        group.append(el);
        return { el, body: s.body, mode: s.mode, r: s.r, length: s.length };
      });
      layer.insertBefore(group, veil);
    }
    // Un corps par clé : les blobs (bleu/orange/pêche) sont partagés entre variantes,
    // le mouvement continue donc d'un écran à l'autre.
    for (const s of Object.values(variants).flat()) {
      bodies[s.body] ??= {
        x: 0, y: 0, vx: 0, vy: 0, p: ROLES[s.body],
        phase: Object.keys(bodies).length * 1.7, // chaque corps a sa propre houle
      };
    }
  }

  // Changement d'écran (transition) : si le fond change, les anciennes formes tombent (figées, CSS
  // .is-falling) et les nouvelles remontent du bas avec le ressort ; si c'est le même fond, petite secousse.
  const DROP = 300;        // px : point de départ des nouvelles formes, sous leur position
  const ENTER_ZETA = 0.55; // amortissement pendant la remontée (pas de jaillissement trop haut)
  const BUMP = 160;        // px/s : secousse quand le fond ne change pas
  const groupOf = (name) => variants[name][0].el.parentElement;

  function setVariant(name, { transition = false } = {}) {
    if (!variants[name]) return;
    const animate = transition && !reduceMotion;
    if (name === active) {
      if (animate) for (const b of Object.values(bodies)) { b.vy -= BUMP; b.vx += (Math.random() - 0.5) * BUMP * 0.5; }
      return;
    }
    if (active) {
      const old = groupOf(active);
      clearTimeout(old.fallTimer);
      if (animate) {
        old.classList.add("is-falling");
        old.fallTimer = setTimeout(() => { old.hidden = true; old.classList.remove("is-falling"); }, 460);
      } else old.hidden = true;
    }
    const next = groupOf(name);
    clearTimeout(next.fallTimer);
    next.classList.remove("is-falling");
    next.hidden = false;
    active = name;
    if (animate) {
      for (const s of variants[name]) {
        if (s.mode !== "roll") continue; // les barres ont leur propre entrée (pop CSS)
        const b = bodies[s.body];
        Object.assign(b, { y: DROP, vy: 0, vx: b.vx * 0.3, entering: true });
      }
    }
    render();
  }

  // ---------- Capteurs ----------

  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const input = {
    source: "aucune",
    permission: typeof window.DeviceMotionEvent?.requestPermission === "function" ? "à demander" : "n/a",
    // Spec W3C : accelerationIncludingGravity = réaction (vers le haut au repos).
    // iOS renvoie l'inverse ; on part de cette hypothèse puis on vérifie avec deviceorientation.
    sign: isIOS ? -1 : 1,
    signChecked: false,
    signVotes: 0,
    beta: null,
    gx: 0, gy: 0,          // gravité apparente lissée, repère écran (x → droite, y → bas), m/s²
    baseY: null,
    lastMotion: 0,
    pointer: null,         // fallback souris : { x, y } normalisés -1…1
  };

  function onOrientation(e) {
    if (e.beta != null) input.beta = e.beta;
  }

  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    const now = performance.now();
    const dt = input.lastMotion ? Math.min((now - input.lastMotion) / 1000, 0.1) : 0.016;
    input.lastMotion = now;
    input.source = "accéléromètre";

    // Gravité apparente en repère écran (y vers le bas), selon la convention spec.
    let gx = -a.x, gy = a.y;

    // Vérifie le signe : téléphone relevé (beta > 0) ⇒ la gravité tire vers le bas de l'écran.
    if (!input.signChecked && input.beta != null && Math.abs(Math.sin(input.beta * Math.PI / 180)) > 0.5) {
      const agree = Math.sign(gy) === Math.sign(Math.sin(input.beta * Math.PI / 180));
      input.signVotes += agree ? 1 : -1;
      if (Math.abs(input.signVotes) >= 8) {
        const sign = input.signVotes > 0 ? 1 : -1;
        if (sign !== input.sign) input.baseY = null; // hypothèse fausse : on repart de la mesure
        input.sign = sign;
        input.signChecked = true;
      }
    }
    gx *= input.sign;
    gy *= input.sign;

    // Première mesure : on s'y cale directement (sinon les shapes « tombent » au démarrage).
    if (input.baseY == null) { input.gx = gx; input.gy = gy; input.baseY = gy; }
    const k = 1 - Math.exp(-dt / SMOOTH_TAU);
    input.gx += (gx - input.gx) * k;
    input.gy += (gy - input.gy) * k;
    input.baseY += (input.gy - input.baseY) * (1 - Math.exp(-dt / BASELINE_TAU));
  }

  addEventListener("devicemotion", onMotion);
  addEventListener("deviceorientation", onOrientation);

  // iOS : l'accès capteurs doit être demandé pendant un geste utilisateur.
  async function requestPermission() {
    const asks = [window.DeviceMotionEvent, window.DeviceOrientationEvent]
      .filter((C) => typeof C?.requestPermission === "function")
      .map((C) => C.requestPermission());
    if (!asks.length) return;
    try {
      const [motion] = await Promise.all(asks);
      input.permission = motion;
    } catch (err) {
      input.permission = `erreur (${err.message || err})`;
    }
  }
  if (input.permission === "à demander") {
    const once = () => {
      removeEventListener("click", once, true);
      removeEventListener("touchend", once, true);
      requestPermission();
    };
    addEventListener("click", once, true);
    addEventListener("touchend", once, true);
  }

  // Fallback souris (desktop) : le curseur incline le « téléphone ».
  const app = document.getElementById("app");
  app.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = app.getBoundingClientRect();
    input.pointer = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: ((e.clientY - r.top) / r.height) * 2 - 1,
    };
  });
  app.addEventListener("pointerleave", () => { input.pointer = null; });

  const pointerG = { x: 0, y: 0 };
  function currentForce(dt) {
    if (performance.now() - input.lastMotion < 1000) {
      return { x: input.gx, y: input.gy - input.baseY };
    }
    // Pas de capteur actif : souris → ±6 m/s² horizontal, ±4 m/s² vertical, lissé.
    const tx = input.pointer ? input.pointer.x * 6 : 0;
    const ty = input.pointer ? input.pointer.y * 4 : 0;
    const k = 1 - Math.exp(-dt / 0.15);
    pointerG.x += (tx - pointerG.x) * k;
    pointerG.y += (ty - pointerG.y) * k;
    input.source = input.pointer ? "souris" : "aucune";
    return pointerG;
  }

  // ---------- Simulation ----------

  // Somme de sinus à périodes non multiples : mouvement lent qui ne se répète pas visiblement.
  function ambient(t, phase) {
    return {
      x: AMBIENT.x * (0.6 * Math.sin(t / 5.3 * 2 * Math.PI + phase) + 0.4 * Math.sin(t / 8.9 * 2 * Math.PI + phase * 1.9)),
      y: AMBIENT.y * (0.6 * Math.sin(t / 6.7 * 2 * Math.PI + phase * 0.7) + 0.4 * Math.sin(t / 11.3 * 2 * Math.PI + phase * 2.3)),
    };
  }

  function step(dt, force, t) {
    for (const b of Object.values(bodies)) {
      const p = b.p;
      const w = 2 * Math.PI * p.hz;
      if (b.entering && Math.abs(b.y) < 4 && Math.abs(b.vy) < 30) b.entering = false;
      const stiff = b.entering ? 1 : 1 + (Math.hypot(b.x, b.y) / SOFT_LIMIT) ** 2;
      const zeta = b.entering ? Math.max(p.zeta, ENTER_ZETA) : p.zeta;
      const amb = ambient(t, b.phase);
      const ax = -w * w * stiff * b.x - 2 * zeta * w * b.vx + p.gain * PX_PER_MS2 * (force.x + amb.x);
      const ay = -w * w * stiff * b.y - 2 * zeta * w * b.vy + p.gain * PX_PER_MS2 * (force.y + amb.y);
      b.vx += ax * dt;
      b.vy += ay * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }

  function render() {
    if (!active) return;
    for (const s of variants[active]) {
      const b = bodies[s.body];
      {
        const angle = (b.x / s.r) * ROLL;
        s.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
      }
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const force = currentForce(dt);
    const sub = 4;
    for (let i = 0; i < sub; i++) step(dt / sub, force, (now - dt * 1000 * (1 - (i + 1) / sub)) / 1000);
    render();
    if (debugEl) updateDebug(force);
    requestAnimationFrame(frame);
  }

  // ---------- Debug ----------

  let debugEl = null;
  if (new URLSearchParams(location.search).has("debug")) {
    debugEl = document.createElement("div");
    debugEl.className = "debug";
    document.body.append(debugEl);
  }
  let debugAt = 0;
  function updateDebug(force) {
    const now = performance.now();
    if (now - debugAt < 100) return;
    debugAt = now;
    debugEl.textContent =
      `contexte sécurisé : ${isSecureContext ? "oui" : "NON (https requis)"}\n` +
      `réduire les animations : ${reduceMotion ? "OUI (animations coupées) → ajoute ?motion=on" : "non"}\n` +
      `permission : ${input.permission}\n` +
      `source : ${input.source}\n` +
      `signe : ${input.sign} ${input.signChecked ? "(vérifié)" : "(supposé)"}\n` +
      `force : x ${force.x.toFixed(2)}  y ${force.y.toFixed(2)} m/s²`;
  }

  // ---------- API ----------

  function init() {
    build();
    Object.values(bodies).forEach((b, i) => { b.vy = -START_KICK * (0.7 + 0.3 * ((i % 3) / 2)); });
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  window.ShapesPhysics = {
    init, setVariant, variants: () => Object.keys(variants),
    // vitesses (px/s) des corps de la variante affichée, pour le retour haptique
    velocities: () => (active ? variants[active].map((s) => bodies[s.body]) : []).map((b) => ({ vx: b.vx, vy: b.vy })),
  };
})();
