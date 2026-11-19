// Labo « Data card » : animation d'entrée « Empilement » du composant Data card (cartouche, bloc orange, pastille).
// Les pièces s'animent avec la Web Animations API (fill both).
// URL : ?label= ?big= ?small= ?duree=1000 ?t=0..1 ?bare.

(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const OVER = "cubic-bezier(0.34, 1.56, 0.64, 1)"; // ressort léger
  const OUT = "cubic-bezier(0.2, 0, 0, 1)";

  // Le bloc monte, le cartouche tombe et se pose, les textes se révèlent par un masque, la pastille s'enclenche.
  // Chaque pièce : { keys, delay, duration, easing } en ms, pour une durée de base de 1000 (mise à l'échelle par ?duree).
  const PARTS = {
    block: { keys: [{ transform: "translateY(64px)", opacity: 0 }, { transform: "none", opacity: 1 }], delay: 0, duration: 620, easing: OVER },
    label: { keys: [{ transform: "translateY(-80px) rotate(-17deg)", opacity: 0 }, { transform: "translateY(0) rotate(1deg)", opacity: 1, offset: .6 }, { transform: "rotate(-5deg)" }], delay: 250, duration: 650, easing: OUT },
    big: { keys: [{ transform: "translateY(105%)" }, { transform: "none" }], delay: 470, duration: 520, easing: OUT },
    small: { keys: [{ transform: "translateY(105%)" }, { transform: "none" }], delay: 560, duration: 520, easing: OUT },
    dot: { keys: [{ transform: "scale(0)" }, { transform: "scale(1.15)", offset: .65 }, { transform: "scale(1)" }], delay: 720, duration: 480, easing: OUT },
  };

  const state = {
    label: params.get("label") ?? "Record battu",
    big: params.get("big") ?? "1 284",
    small: params.get("small") ?? "vues cette semaine",
    duree: Number(params.get("duree")) || 1000,
  };

  const $ = (id) => document.getElementById(id);
  const app = $("app"), bar = $("bar");
  const els = { block: $("dc-block"), big: $("dc-big"), small: $("dc-small"), dot: $("dc-dot"), label: $("dc-label") };
  if (params.has("bare")) bar.hidden = true;

  const fitScale = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fitScale);
  fitScale();

  // Fond : formes physiques « horloges » (js/physics.js : gyroscope / souris)
  window.ShapesPhysics.init();
  window.ShapesPhysics.setVariant("clocks");

  // ---------- Lecture ----------
  let anims = [];
  function play() {
    anims.forEach((a) => a.cancel());
    anims = [];
    if (reduced) return;
    const k = state.duree / 1000;
    let total = 0;
    for (const [name, p] of Object.entries(PARTS)) {
      anims.push(els[name].animate(p.keys, { duration: p.duration * k, delay: p.delay * k, easing: p.easing, fill: "both" }));
      total = Math.max(total, (p.delay + p.duration) * k);
    }
    if (params.has("t")) { // ?t=0..1 fige l'animation à cet instant
      const ms = Math.min(1, Math.max(0, Number(params.get("t")) || 0)) * total;
      anims.forEach((a) => { a.pause(); a.currentTime = ms; });
    }
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Data card</h1>
    <label>[Label]<input id="in-label" type="text" value="${esc(state.label)}"></label>
    <label>[Big]<input id="in-big" type="text" value="${esc(state.big)}"></label>
    <label>[Small]<input id="in-small" type="text" value="${esc(state.small)}"></label>
    <label>Durée (ms)<input id="in-duree" type="number" min="300" step="100" value="${state.duree}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;
  $("in-label").addEventListener("input", (e) => { state.label = $("dc-label-text").textContent = e.target.value; });
  $("in-big").addEventListener("input", (e) => { state.big = els.big.textContent = e.target.value; });
  $("in-small").addEventListener("input", (e) => { state.small = els.small.textContent = e.target.value; });
  $("in-duree").addEventListener("change", (e) => { state.duree = Math.max(300, Number(e.target.value) || 1000); play(); });
  $("replay").addEventListener("click", play);

  $("dc-label-text").textContent = state.label;
  els.big.textContent = state.big;
  els.small.textContent = state.small;
  document.fonts.ready.then(play);
})();
