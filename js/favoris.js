// Labo « Favoris » : un compteur à roues monte de 0 à N (courbe linéaire) et une grille de cœurs se remplit, un cœur par incrément.
// Lien déclaratif : l'élément du chiffre porte data-count-to="N" et data-count-sync="<sélecteur>" ; les N premiers éléments
// trouvés dans l'écran reçoivent .is-on. Chaque incrément émet « wrapup:count » (detail.value) : la grille se recalcule alors.
// Fond : formes physiques « cœurs » (shapes.js + physics.js).
// Les roues reprennent celles de « Data simple » (data.js). URL : ?haut= ?valeur= ?bas= ?duree= ?t=0..1

(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const clampN = (s) => Math.min(999999999, Math.max(1, parseInt(String(s).replace(/\D/g, ""), 10) || 1));
  const state = {
    haut: params.get("haut") ?? "Certaines ont retenu votre attention",
    valeur: clampN(params.get("valeur") ?? 23),
    bas: params.get("bas") ?? "annonces mises en favoris",
    duree: Number(params.get("duree")) || 1600,
  };

  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  const screen = document.getElementById("screen");
  const grid = document.getElementById("grid");
  const elTop = document.getElementById("fav-top");
  const elValue = document.getElementById("fav-value");
  const elUnit = document.getElementById("fav-unit");
  if (params.has("bare")) bar.hidden = true;
  if (reduced) screen.classList.add("no-motion");

  const fitScale = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fitScale);
  fitScale();

  // ---------- Grille de cœurs ----------
  const MAX_HEARTS = 100; // le compteur peut dépasser, la grille s'arrête là
  const HW = 47.2, HH = 41.352, GAP = 10, MAXW = 327, CX = 188.19, TOP = 296, BOTTOM_MARGIN = 48, SCREEN_H = 812;
  const HEART = `<svg viewBox="0 0 48 42" preserveAspectRatio="none"><path fill="var(--main)" d="M24 41.4S1 27.5 1 13.6C1 6.8 6.3 1.2 13 1.2c4.6 0 8.6 2.4 11 6.4 2.4-4 6.4-6.4 11-6.4 6.7 0 12 5.6 12 12.4C47 27.5 24 41.4 24 41.4z"/></svg>`;
  const gw = (c) => c * HW + (c - 1) * GAP;
  const gh = (r) => r * HH + (r - 1) * GAP;
  const fit = (cols, n) => Math.min(1, MAXW / gw(Math.min(cols, n)), (SCREEN_H - BOTTOM_MARGIN - TOP) / gh(Math.ceil(n / cols)));
  function chooseCols(total) { // une seule fois, d'après le total final : le plus gros fit (largeur et hauteur utilisées au mieux), à égalité le moins de colonnes
    let best = 6, bestFit = -1;
    for (let c = 6; c <= 30; c++) {
      const f = fit(c, total);
      if (f > bestFit + 1e-6) { best = c; bestFit = f; }
    }
    return best;
  }
  function apply(g, n) { // la grille entière se centre sur ce qui est affiché et dézoome
    const cols = Number(g.dataset.cols);
    n = Math.min(Math.max(1, n), Number(g.dataset.total));
    const f = fit(cols, n);
    const x = CX - (gw(Math.min(cols, n)) * f) / 2;
    g.style.transform = `translate(${x}px, 0) scale(${f})`;
  }
  function buildGrid(count) {
    const total = Math.min(count, MAX_HEARTS);
    grid.dataset.total = total;
    const cols = chooseCols(total);
    grid.dataset.cols = cols;
    grid.innerHTML = Array.from({ length: total }, (_, i) =>
      `<span class="heart" style="transform: translate(${(i % cols) * (HW + GAP)}px, ${Math.floor(i / cols) * (HH + GAP)}px)">${HEART}</span>`).join("");
  }

  // Lien compteur → éléments : les n premiers éléments du sélecteur reçoivent .is-on.
  let synced = [];
  function sync(n) {
    synced.forEach((el, i) => el.classList.toggle("is-on", i < n));
  }
  screen.addEventListener("wrapup:count", (e) => {
    sync(e.detail.value);
    apply(grid, e.detail.value);
  });

  // ---------- Roues (comme data.js) ----------
  const STRIP = [..."01234567890"].map((d) => `<span>${d}</span>`).join("");
  const LH = 108;
  const format = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  let run = null, raf = 0;

  function show(part, visible) {
    if (part.shown === visible) return;
    const opening = visible && part.shown === false;
    part.shown = visible;
    part.el.style.width = visible ? `${part.width}px` : "0px";
    part.el.style.opacity = visible ? 1 : 0;
    if (opening) {
      part.el.classList.add("is-opening");
      clearTimeout(part.timer);
      part.timer = setTimeout(() => part.el.classList.remove("is-opening"), 350);
    }
  }
  function paint(r, v) {
    for (const w of r.wheels) {
      const unit = 10 ** w.k;
      let pos;
      if (w.k === 0) pos = v % 10;
      else {
        const rest = v % unit;
        pos = (Math.floor(v / unit) + Math.min(1, Math.max(0, rest - (unit - 1)))) % 10;
      }
      w.strip.style.translate = `0 ${(-pos * LH).toFixed(2)}px`;
      show(w, w.k === 0 || v >= unit - 1);
    }
    for (const p of r.parts) if (!p.strip) show(p, !p.after || p.after.shown);
  }
  function build(target) {
    const str = format(target);
    let k = str.replace(/\D/g, "").length;
    const html = [...str].map((c) => {
      if (!/\d/.test(c)) return `<span class="roll-sep">${c}</span>`;
      k -= 1;
      return `<span class="roll-d" data-k="${k}"><span class="roll-ghost">${c}</span><span class="roll-strip">${STRIP}</span></span>`;
    }).join("");
    elValue.innerHTML = `<span class="sr-only">${str}</span><span class="roll" aria-hidden="true">${html}</span>`;
    const scale = parseFloat(getComputedStyle(app).getPropertyValue("--s")) || 1;
    let wheel = null;
    const parts = [...elValue.querySelectorAll(".roll-d, .roll-sep")].map((el) => {
      const part = { el, width: el.getBoundingClientRect().width / scale, shown: null };
      if (el.classList.contains("roll-d")) wheel = Object.assign(part, { k: Number(el.dataset.k), strip: el.querySelector(".roll-strip") });
      else part.after = wheel;
      return part;
    });
    return { parts, wheels: parts.filter((p) => p.strip) };
  }

  // ---------- Lecture ----------
  function play() {
    cancelAnimationFrame(raf);
    const target = Number(elValue.dataset.countTo) || 0;
    synced = [...screen.querySelectorAll(elValue.dataset.countSync)];
    const r = build(target);
    run = r;

    screen.classList.add("resetting");
    screen.classList.remove("is-in");
    synced.forEach((el) => el.classList.remove("is-on"));
    apply(grid, target);
    void screen.offsetWidth;

    if (reduced) { // état final direct
      paint(r, target);
      r.parts.forEach((p) => { p.el.style.transition = "none"; p.el.style.width = ""; });
      sync(target);
      screen.classList.remove("resetting");
      return;
    }
    paint(r, 0);
    apply(grid, 1);
    void screen.offsetWidth;
    screen.classList.remove("resetting");
    screen.classList.add("is-in");

    if (params.has("t")) { // ?t=0..1 fige l'animation à cet instant (pour comparer / capturer)
      const v = target * Math.min(1, Math.max(0, Number(params.get("t")) || 0));
      screen.classList.add("no-motion");
      paint(r, v);
      elValue.dispatchEvent(new CustomEvent("wrapup:count", { bubbles: true, detail: { value: Math.floor(v) } }));
      return;
    }
    const delay = 250;
    let shown = 0;
    const t0 = performance.now();
    const tick = (now) => {
      if (run !== r) return;
      const t = Math.min(1, Math.max(0, (now - t0 - delay) / state.duree));
      const v = target * t; // linéaire
      paint(r, v);
      const n = Math.floor(v + 1e-9);
      if (n !== shown) {
        shown = n;
        elValue.dispatchEvent(new CustomEvent("wrapup:count", { bubbles: true, detail: { value: n } }));
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { if (run === r) r.parts.forEach((p) => { p.el.style.width = ""; }); }, 400);
    };
    raf = requestAnimationFrame(tick);
  }

  function setTotal() {
    elValue.dataset.countTo = state.valeur;
    buildGrid(state.valeur);
    play();
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Favoris</h1>
    <label>[Accroche]<input id="in-haut" type="text" value="${esc(state.haut)}"></label>
    <label>[23] compteur (1–999 999 999)<input id="in-valeur" type="text" inputmode="numeric" value="${state.valeur}"></label>
    <label>[Unité]<input id="in-bas" type="text" value="${esc(state.bas)}"></label>
    <label>Durée (ms)<input id="in-duree" type="number" min="200" step="100" value="${state.duree}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;
  const $ = (id) => document.getElementById(id);
  let timer = 0;
  $("in-haut").addEventListener("input", (e) => { state.haut = elTop.textContent = e.target.value; });
  $("in-bas").addEventListener("input", (e) => { state.bas = elUnit.textContent = e.target.value; });
  $("in-valeur").addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) return;
    state.valeur = clampN(digits);
    clearTimeout(timer);
    timer = setTimeout(setTotal, 400);
  });
  $("in-valeur").addEventListener("blur", (e) => { e.target.value = state.valeur; });
  $("in-duree").addEventListener("change", (e) => { state.duree = Math.max(200, Number(e.target.value) || 1600); play(); });
  $("replay").addEventListener("click", play);

  window.ShapesPhysics.init(); // fond : formes physiques « cœurs » (js/physics.js), gyroscope / souris
  window.ShapesPhysics.setVariant("hearts", { transition: false });
  $("replay").addEventListener("click", () => window.ShapesPhysics.setVariant("hearts", { transition: true })); // petite secousse

  elTop.textContent = state.haut;
  elUnit.textContent = state.bas;
  buildGrid(state.valeur);
  apply(grid, state.valeur); // rendu initial : état final correct
  elValue.dataset.countTo = state.valeur;
  document.fonts.ready.then(setTotal);
})();
