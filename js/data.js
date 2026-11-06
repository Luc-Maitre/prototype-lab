// Labo « Data simple » : le nombre défile comme un compteur kilométrique (même animation que le wrap-up).
// Chaque chiffre est une roue ; les unités tournent en continu, chaque roue avance quand celle de droite passe de 9 à 0.
// Les textes entre [] du composant Figma sont modifiables dans la barre. URL : ?haut= ?valeur= ?bas= ?duree= ?courbe=

(() => {
  const EASE = {
    decelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    accelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
    linear: "linear",
  };
  const easing = (css) => {
    const m = css.match(/cubic-bezier\(([^)]+)\)/);
    if (!m) return (t) => t;
    const [x1, y1, x2, y2] = m[1].split(",").map(Number);
    const bez = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (bez(x1, x2, t) < x) lo = t; else hi = t; }
      return bez(y1, y2, t);
    };
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const params = new URLSearchParams(location.search);
  const state = {
    haut: params.get("haut") ?? "Vous avez passé",
    valeur: (params.get("valeur") ?? "1234").replace(/\D/g, "") || "0",
    bas: params.get("bas") ?? "heures sur leboncoin",
    duree: Number(params.get("duree")) || 1500,
    courbe: EASE[params.get("courbe")] ? params.get("courbe") : "decelerate",
  };

  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  if (params.has("bare")) bar.hidden = true;
  const elTop = document.getElementById("ds-top");
  const elValue = document.getElementById("ds-value");
  const elBottom = document.getElementById("ds-bottom");

  const fit = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fit);
  fit();

  const format = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ---------- Roues ----------
  const STRIP = [..."01234567890"].map((d) => `<span>${d}</span>`).join("");
  const LH = 108; // line-height du nombre
  let run = null;
  let raf = 0;

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

  function play() {
    cancelAnimationFrame(raf);
    const target = parseInt(state.valeur, 10) || 0;
    const r = build(target);
    run = r;
    if (reduced) { r.parts.forEach((p) => { p.el.style.transition = "none"; }); paint(r, target); r.parts.forEach((p) => { p.el.style.width = ""; }); return; }
    const curve = easing(EASE[state.courbe]);
    if (params.has("t")) { // ?t=0..1 fige l'animation à cet instant (pour comparer / capturer)
      const t = Math.min(1, Math.max(0, Number(params.get("t")) || 0));
      r.parts.forEach((p) => { p.el.style.transition = "none"; });
      paint(r, target * curve(t));
      return;
    }
    const delay = 250;
    const t0 = performance.now();
    paint(r, 0);
    const tick = (now) => {
      if (run !== r) return;
      const t = Math.min(1, Math.max(0, (now - t0 - delay) / state.duree));
      paint(r, target * curve(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        paint(r, target);
        setTimeout(() => { if (run === r) r.parts.forEach((p) => { p.el.style.width = ""; }); }, 400);
      }
    };
    raf = requestAnimationFrame(tick);
  }

  // ---------- Textes ----------
  function renderLabels() {
    elTop.textContent = state.haut;
    elBottom.textContent = state.bas;
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Data simple</h1>
    <label>[Top label]<input id="in-haut" type="text" value="${esc(state.haut)}"></label>
    <label>[1234]<input id="in-valeur" type="text" inputmode="numeric" value="${esc(state.valeur)}"></label>
    <label>[bottom label]<input id="in-bas" type="text" value="${esc(state.bas)}"></label>
    <label>Courbe<select id="in-courbe">${Object.keys(EASE).map((k) => `<option${k === state.courbe ? " selected" : ""}>${k}</option>`).join("")}</select></label>
    <label>Durée (ms)<input id="in-duree" type="number" min="200" step="100" value="${state.duree}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;

  const $ = (id) => document.getElementById(id);
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(play, 400); };
  $("in-haut").addEventListener("input", (e) => { state.haut = e.target.value; renderLabels(); });
  $("in-bas").addEventListener("input", (e) => { state.bas = e.target.value; renderLabels(); });
  $("in-valeur").addEventListener("input", (e) => {
    state.valeur = e.target.value.replace(/\D/g, "").slice(0, 9) || "0";
    later();
  });
  $("in-courbe").addEventListener("change", (e) => { state.courbe = e.target.value; play(); });
  $("in-duree").addEventListener("change", (e) => { state.duree = Math.max(200, Number(e.target.value) || 1500); play(); });
  $("replay").addEventListener("click", play);

  renderLabels();
  document.fonts.ready.then(play); // la chasse des chiffres est mesurée une fois Nunito chargée
})();
