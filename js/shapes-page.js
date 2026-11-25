// Labo « Formes physiques » : les 7 variants du fond (horloges, étoiles, bulles, cœurs, étiquettes, pièces, abonnés).
// Les formes réagissent à l'accéléromètre (mobile) ou à la souris (desktop) : voir js/physics.js.
// Touches ← → : changer de variant. URL : ?v=clocks|stars|bubbles|hearts|tags|coins|followers, ?debug, ?bare, ?motion (ignore « réduire les animations »).

(() => {
  const NAMES = { clocks: "Horloges", stars: "Étoiles", bubbles: "Bulles", hearts: "Cœurs", tags: "Étiquettes", coins: "Pièces", followers: "Abonnés" };
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
  const MINUTE_DEG_PER_S = [22, 14, 34]; // ordre Figma : horloge bleue, orange (grande), pêche
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

  window.Haptics.init({ bar, before: bar.querySelector(".hint"), reduced, debug: params.has("debug") });

  select(params.get("v"), false);
})();
