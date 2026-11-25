// Labo « Abonnés » : Data simple (« Vous êtes suivi par 12 personnes ») puis 11 bulles d'avatar, sur le fond « abonnés ».
// Le nombre de bulles est fixe (11) quel que soit le nombre d'abonnés. Entrée « Essaim » : les bulles partent du centre.
// Compteur : js/data.js en mode window.WRAPUP. Fond : js/physics.js. Animations : Web Animations, ressorts échantillonnés.
// URL : ?ecart=70 ?haut= ?valeur= ?bas= ?t=0..1 ?bare

(() => {
  const { data } = window.WRAPUP;
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const bar = $("bar");
  const box = $("followers");
  bar.hidden = params.has("bare");

  Object.assign(data.state, {
    haut: params.get("haut") ?? "Vous êtes suivi par",
    valeur: (params.get("valeur") ?? "12").replace(/\D/g, "") || "0",
    bas: params.get("bas") ?? "personnes",
  });

  // ---------- Bulles : positions et couleurs du Figma (Followers, 327 × 132) ----------
  const AV = {
    l: { avatar: "assets/followers/avatar-l.svg", user: "assets/followers/user-l.svg", h: 33 },
    m: { avatar: "assets/followers/avatar-m.svg", user: "assets/followers/user-m.svg", h: 32 },
    a: { avatar: "assets/followers/avatar-a.svg", user: "assets/followers/user-a.svg", h: 32 },
  };
  const BUBBLES = [
    ..."lmalma".split("").map((c, i) => ({ c, row: 0, col: i, x: -2.5 + 52 * i, y: -0.28 })),
    ..."mmalm".split("").map((c, i) => ({ c, row: 1, col: i, x: 23.5 + 52 * i, y: 59.72 })),
  ];
  // la 11e bulle (« Avatar +114 » dans le Figma) est grise
  BUBBLES[10].c = "m";
  box.innerHTML = BUBBLES.map((b) => {
    const a = AV[b.c];
    return `<span class="fl-b" style="left:${b.x}px;top:${b.y}px"><span class="fl-in">` +
      `<img class="fl-avatar" src="${a.avatar}" width="72" height="72" alt="">` +
      `<img class="fl-user${a.h === 33 ? " is-tall" : ""}" src="${a.user}" width="32" height="${a.h}" alt=""></span></span>`;
  }).join("");
  const inners = [...box.querySelectorAll(".fl-in")];

  const rankOf = (order) => { const r = []; order.forEach((idx, k) => { r[idx] = k; }); return r; };
  const CX = 163.5, CY = 66; // centre du bloc
  const center = (b) => [b.x + 36, b.y + 36];

  // ---------- Ressorts ----------
  const FPS = 60, DT = 1 / FPS;
  function spring(k, c) { // progression 0 → 1, échantillonnée à 60 i/s
    let x = 0, v = 0;
    const out = [0];
    for (let i = 0; i < 400; i++) {
      v += (-k * (x - 1) - c * v) * DT;
      x += v * DT;
      out.push(x);
      if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.02) break;
    }
    out[out.length - 1] = 1;
    return out;
  }
  const frames = (samples, fn) => ({
    keyframes: samples.map((p, j) => fn(p, j / (samples.length - 1), j)),
    duration: ((samples.length - 1) * 1000) / FPS,
  });
  const fade = (t, speed) => Math.min(1, t * speed).toFixed(3);

  // ---------- Essaim ----------
  // Pour la bulle i : { keyframes, duration, delay } ; les plus proches du centre partent en premier,
  // « ecart » = décalage entre deux bulles.
  const dist = (x) => Math.hypot(...center(x).map((v, k) => v - [CX, CY][k]));
  const RANK = rankOf(BUBBLES.map((x, k) => k).sort((p, q) => dist(BUBBLES[p]) - dist(BUBBLES[q])));
  function essaim(i, b, ecart) {
    const [bx, by] = center(b);
    const dx = CX - bx, dy = CY - by;
    const s = spring(170, 14);
    return {
      delay: RANK[i] * ecart * 0.5,
      ...frames(s, (p, t) => ({
        transform: `translate(${(dx * (1 - p)).toFixed(2)}px, ${(dy * (1 - p)).toFixed(2)}px) scale(${(0.35 + 0.65 * p).toFixed(4)})`,
        opacity: fade(t, 6),
      })),
    };
  }

  const state = {
    ecart: Number(params.get("ecart") ?? 70),
  };

  // ---------- Fond ----------
  window.ShapesPhysics.init();
  window.ShapesPhysics.setVariant("followers", { transition: false });

  // ---------- Lecture ----------
  let anims = [];
  function playBubbles() {
    anims.forEach((a) => a.cancel());
    anims = [];
    if (reduced) { box.classList.remove("is-waiting"); return; }
    const start = data.delay; // les bulles partent avec le compteur
    anims = BUBBLES.map((b, i) => {
      const { keyframes, duration, delay } = essaim(i, b, state.ecart);
      return inners[i].animate(keyframes, { duration, delay: start + delay, fill: "both", easing: "linear" });
    });
    box.classList.remove("is-waiting");
    if (params.has("t")) { // ?t=0..1 fige l'entrée à cet instant (pour comparer / capturer)
      const end = Math.max(...anims.map((a) => a.effect.getComputedTiming().endTime));
      const t = Math.min(1, Math.max(0, Number(params.get("t")) || 0));
      anims.forEach((a) => { a.pause(); a.currentTime = t * end; });
    }
  }
  function play() {
    box.classList.add("is-waiting");
    data.renderLabels();
    data.play();
    playBubbles();
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Abonnés</h1>
    <label>Écart entre bulles (ms)<input id="in-ecart" type="number" min="0" step="10" value="${state.ecart}"></label>
    <label>[Top label]<input id="in-haut" type="text" value="${esc(data.state.haut)}"></label>
    <label>[12]<input id="in-valeur" type="text" inputmode="numeric" value="${esc(data.state.valeur)}"></label>
    <label>[bottom label]<input id="in-bas" type="text" value="${esc(data.state.bas)}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;

  let later = 0;
  $("in-ecart").addEventListener("change", (e) => { state.ecart = Math.max(0, Number(e.target.value) || 0); play(); });
  $("in-haut").addEventListener("input", (e) => { data.state.haut = e.target.value; data.renderLabels(); });
  $("in-bas").addEventListener("input", (e) => { data.state.bas = e.target.value; data.renderLabels(); });
  $("in-valeur").addEventListener("input", (e) => {
    data.state.valeur = e.target.value.replace(/\D/g, "").slice(0, 9) || "0";
    clearTimeout(later); later = setTimeout(play, 400);
  });
  $("replay").addEventListener("click", play);

  box.classList.add("is-waiting");
  data.renderLabels();
  document.fonts.ready.then(play);
})();
