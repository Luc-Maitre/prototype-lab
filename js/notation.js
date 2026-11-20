// Labo « Notation » : un compteur à roues monte de 0 à la note (courbe linéaire) pendant que 5 étoiles se remplissent.
// Animation d'étoiles : remplissage (les étoiles vides se remplissent de gauche à droite au rythme du compteur).
// URL : ?note=4.9 ?haut= ?bas= ?duree= ?t=0..1 ?bare. Touches ← →.

(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const clampNote = (s) => Math.min(5, Math.max(0.1, Math.round(parseFloat(String(s).replace(",", ".")) * 10) / 10 || 4.9));
  const state = {
    haut: params.get("haut") ?? "Vos acheteurs vous notent",
    note: clampNote(params.get("note") ?? 4.9),
    bas: params.get("bas") ?? "en moyenne",
    duree: Number(params.get("duree")) || 1600,
  };

  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  const screen = document.getElementById("screen");
  const elTop = document.getElementById("nt-top");
  const elValue = document.getElementById("nt-value");
  const elUnit = document.getElementById("nt-unit");
  const elStars = document.getElementById("stars");
  if (params.has("bare")) bar.hidden = true;
  if (reduced) screen.classList.add("no-motion");

  const fitScale = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fitScale);
  fitScale();

  // ---------- Fond : formes physiques « étoiles » (js/physics.js : gyroscope / souris) ----------
  window.ShapesPhysics.init();
  window.ShapesPhysics.setVariant("stars");

  // ---------- Étoiles : forme arrondie (polygone étoilé + trait à jointure ronde) ----------
  const STAR_PATH = (() => {
    const R = 19.6, r = R * 0.5, cx = 26, cy = 28.1;
    return Array.from({ length: 10 }, (_, k) => {
      const a = ((-90 + 36 * k) * Math.PI) / 180, d = k % 2 ? r : R;
      return `${k ? "L" : "M"}${(cx + d * Math.cos(a)).toFixed(2)} ${(cy + d * Math.sin(a)).toFixed(2)}`;
    }).join("") + "Z";
  })();
  const layer = (cls) => `<svg class="${cls}" viewBox="0 0 52 52"><path d="${STAR_PATH}" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>`;
  elStars.innerHTML = Array.from({ length: 5 }, () => `<span class="star">${layer("s-empty")}${layer("s-fill")}</span>`).join("");
  const stars = [...elStars.children];

  // Étoile partielle à l'échelle : la coupe est mesurée sur la largeur de la forme (4,36 → 47,64 sur 52), pas sur la boîte : 3,5 = 3 pleines + 1 à 50 %
  const GLYPH_L = 4.36, GLYPH_W = 43.28;
  const frac = (i, r) => Math.min(1, Math.max(0, r - i));
  const cutOf = (i, r) => { const f = frac(i, r); return f < 1 ? (GLYPH_L + f * GLYPH_W) / 52 : 1; };

  // État à l'instant « r » (note courante du compteur), sans animation
  function render(r) {
    stars.forEach((el, i) => el.style.setProperty("--cut", cutOf(i, r)));
  }

  function wave() { // vague de pulsation d'une étoile à l'autre
    stars.forEach((el, i) => el.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.2)", offset: 0.4 }, { transform: "scale(1)" }],
      { duration: 460, delay: i * 70, easing: "cubic-bezier(0.2, 0, 0, 1)" }));
  }

  // ---------- Roues (comme favoris.js) : « 4.9 » = 2 chiffres (unités, dixièmes), compteur en dixièmes ----------
  const STRIP = [..."01234567890"].map((d) => `<span>${d}</span>`).join("");
  const LH = 108;
  const fmt = (t) => `${Math.floor(t / 10)}.${t % 10}`;
  let run = null, raf = 0;

  function paint(r, v) { // v en dixièmes (continu)
    for (const w of r.wheels) {
      let pos;
      if (w.k === 0) pos = v % 10;
      else { const rest = v % 10; pos = (Math.floor(v / 10) + Math.min(1, Math.max(0, rest - 9))) % 10; }
      w.strip.style.translate = `0 ${(-pos * LH).toFixed(2)}px`;
    }
  }
  function build(tenths) {
    const str = fmt(tenths);
    let k = 1;
    const html = [...str].map((c) => {
      if (!/\d/.test(c)) return `<span class="roll-sep">${c}</span>`;
      return `<span class="roll-d" data-k="${k--}"><span class="roll-ghost">${c}</span><span class="roll-strip">${STRIP}</span></span>`;
    }).join("");
    elValue.innerHTML = `<span class="sr-only">${str} sur 5</span><span class="roll" aria-hidden="true">${html}</span>`;
    return { wheels: [...elValue.querySelectorAll(".roll-d")].map((el) => ({ k: Number(el.dataset.k), strip: el.querySelector(".roll-strip") })) };
  }

  // ---------- Lecture ----------
  function play() {
    cancelAnimationFrame(raf);
    const note = state.note, tenths = Math.round(note * 10);
    const r = build(tenths);
    run = r;
    stars.forEach((el) => { el.getAnimations().forEach((a) => a.cancel()) });

    screen.classList.add("resetting");
    screen.classList.remove("is-in");
    render(note);
    void screen.offsetWidth;

    if (reduced) { paint(r, tenths); screen.classList.remove("resetting"); return; }
    if (params.has("t")) { // ?t=0..1 fige l'animation à cet instant
      const t = Math.min(1, Math.max(0, Number(params.get("t")) || 0));
      screen.classList.add("no-motion");
      paint(r, tenths * t);
      render(note * t);
      return;
    }
    paint(r, 0);
    render(0);
    void screen.offsetWidth;
    screen.classList.remove("resetting");
    screen.classList.add("is-in");

    const delay = 250;
    const t0 = performance.now();
    const tick = (now) => {
      if (run !== r) return;
      const t = Math.min(1, Math.max(0, (now - t0 - delay) / state.duree));
      paint(r, tenths * t); // linéaire
      const cur = note * t;
      render(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        setTimeout(() => { if (run === r) wave(); }, 120);
      }
    };
    raf = requestAnimationFrame(tick);
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Notation</h1>
    <label>[Accroche]<input id="in-haut" type="text" value="${esc(state.haut)}"></label>
    <label>[4.9] note (0,1–5)<input id="in-note" type="text" inputmode="decimal" value="${state.note}"></label>
    <label>[Unité]<input id="in-bas" type="text" value="${esc(state.bas)}"></label>
    <label>Durée (ms)<input id="in-duree" type="number" min="200" step="100" value="${state.duree}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;
  const $ = (id) => document.getElementById(id);
  let timer = 0;
  $("in-haut").addEventListener("input", (e) => { state.haut = elTop.textContent = e.target.value; });
  $("in-bas").addEventListener("input", (e) => { state.bas = elUnit.textContent = e.target.value; });
  $("in-note").addEventListener("input", (e) => {
    if (!/\d/.test(e.target.value)) return;
    state.note = clampNote(e.target.value);
    clearTimeout(timer);
    timer = setTimeout(play, 400);
  });
  $("in-note").addEventListener("blur", (e) => { e.target.value = state.note; });
  $("in-duree").addEventListener("change", (e) => { state.duree = Math.max(200, Number(e.target.value) || 1600); play(); });
  $("replay").addEventListener("click", play);

  elTop.textContent = state.haut;
  elUnit.textContent = state.bas;
  build(Math.round(state.note * 10));
  render(state.note);
  document.fonts.ready.then(play);
})();
