// Labo « Formes physiques » : les 4 variants du fond wrap-up (horloges, étoiles, bulles, cœurs).
// Les formes réagissent à l'accéléromètre (mobile) ou à la souris (desktop) : voir js/physics.js.
// Touches ← → : changer de variant. URL : ?v=clocks|stars|bubbles|hearts, ?debug, ?bare, ?motion (ignore « réduire les animations »).

(() => {
  const NAMES = { clocks: "Horloges", stars: "Étoiles", bubbles: "Bulles", hearts: "Cœurs" };
  const params = new URLSearchParams(location.search);
  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  if (params.has("bare")) bar.hidden = true;

  const fit = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fit);
  fit();

  window.ShapesPhysics.init();
  const ids = window.ShapesPhysics.variants();
  let current = null;

  function select(id, transition = true) {
    if (!ids.includes(id)) id = ids[0];
    current = id;
    window.ShapesPhysics.setVariant(id, { transition });
    bar.querySelectorAll("button[data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === id)));
    history.replaceState(null, "", `?v=${id}${params.has("debug") ? "&debug" : ""}`);
  }

  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Formes physiques</h1>
    ${ids.map((id) => `<button type="button" data-v="${id}">${NAMES[id] ?? id}</button>`).join("")}
    <button type="button" class="replay" data-act="shake">Secouer</button>
    <p class="hint">Incline le téléphone, ou bouge la souris sur l'écran.</p>`;
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v) select(b.dataset.v);
    if (b.dataset.act === "shake") window.ShapesPhysics.setVariant(current, { transition: true });
  });
  addEventListener("keydown", (e) => {
    const i = ids.indexOf(current);
    if (e.key === "ArrowRight") select(ids[(i + 1) % ids.length]);
    if (e.key === "ArrowLeft") select(ids[(i + ids.length - 1) % ids.length]);
  });

  // Horloges : les aiguilles tournent dans le sens horaire, à une vitesse propre à chaque horloge ;
  // l'aiguille des heures avance 12 fois moins vite que celle des minutes (logique d'une vraie horloge).
  const MINUTE_DEG_PER_S = [22, 34, 14]; // horloge 1 (bleue), 2 (pêche), 3 (orange, grande)
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches && !params.has("motion");
  const hands = [...document.querySelectorAll('[data-variant="clocks"] .shape')].flatMap((shape, i) =>
    [...shape.querySelectorAll("[data-hand]")].map((el) => ({
      el, px: el.dataset.px, py: el.dataset.py,
      speed: MINUTE_DEG_PER_S[i] / (el.dataset.hand === "hours" ? 12 : 1),
    })));
  if (!reduced) {
    const t0 = performance.now();
    const spin = (now) => {
      const t = (now - t0) / 1000;
      for (const h of hands) h.el.setAttribute("transform", `rotate(${(t * h.speed).toFixed(3)} ${h.px} ${h.py})`);
      requestAnimationFrame(spin);
    };
    requestAnimationFrame(spin);
  }

  // Haptique : de très légères vibrations, comme des billes qui roulent dans le téléphone.
  // - roulement : micro-pulsations dont le rythme suit la vitesse des formes ;
  // - choc : un peu plus net quand une forme repart dans l'autre sens à bonne vitesse (bille qui tape).
  // navigator.vibrate n'existe que sur Android (Chrome) et demande un premier tap sur la page ; pas sur iOS Safari.
  const canVibrate = typeof navigator.vibrate === "function";
  const haptics = { on: canVibrate && localStorage.getItem("shapes-haptics") !== "off", last: 0, prev: [] };
  const ROLL_MIN = 70;    // px/s : en dessous, les formes sont « posées », pas de vibration
  const ROLL_GAP = [150, 55]; // ms entre deux pulsations : vitesse ROLL_MIN → ROLL_FAST
  const ROLL_FAST = 600;  // px/s
  const PULSE = 6;        // ms : très léger
  const IMPACT = 120;     // px/s : vitesse minimale avant inversion pour compter comme un choc
  function haptic(now) {
    const v = window.ShapesPhysics.velocities();
    let speed = 0, hit = 0;
    v.forEach((b, i) => {
      speed = Math.max(speed, Math.hypot(b.vx, b.vy));
      const p = haptics.prev[i];
      if (p) for (const [a, c] of [[p.vx, b.vx], [p.vy, b.vy]]) if (a * c < 0 && Math.abs(a) > IMPACT) hit = Math.max(hit, Math.abs(a));
    });
    haptics.prev = v;
    if (!haptics.on || document.hidden) return;
    if (hit && now - haptics.last > 70) { navigator.vibrate(hit > 350 ? 14 : 9); haptics.last = now; return; }
    if (speed < ROLL_MIN) return;
    const k = Math.min(1, (speed - ROLL_MIN) / (ROLL_FAST - ROLL_MIN));
    if (now - haptics.last > ROLL_GAP[0] + (ROLL_GAP[1] - ROLL_GAP[0]) * k) { navigator.vibrate(PULSE); haptics.last = now; }
  }
  if (!reduced) {
    const loop = (now) => { haptic(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  const hapBtn = document.createElement("button");
  hapBtn.type = "button";
  hapBtn.textContent = canVibrate ? "Vibrations : " + (haptics.on ? "oui" : "non") : "Vibrations indisponibles (Android seulement)";
  hapBtn.disabled = !canVibrate;
  hapBtn.addEventListener("click", () => {
    haptics.on = !haptics.on;
    localStorage.setItem("shapes-haptics", haptics.on ? "on" : "off");
    hapBtn.textContent = "Vibrations : " + (haptics.on ? "oui" : "non");
    if (haptics.on) navigator.vibrate(20);
  });
  bar.querySelector(".hint").before(hapBtn);

  select(params.get("v"), false);
})();
