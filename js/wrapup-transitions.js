// Labo « Transitions entre écrans » : glissement horizontal, passage d'un écran au suivant, hors page turn.
// (Le page turn est réservé à deux cas : intro → premier écran, et reveal → écran d'avant.)
// Les écrans sont les pages du labo chargées en ?bare : l'écran entrant est rechargé à chaque passage, son animation d'entrée rejoue
// pendant la transition. Le fond de formes physiques appartient à cette page : il ne coupe pas d'un écran à l'autre (les formes
// du nouveau fond remontent, celles de l'ancien tombent) et il est embarqué par le mouvement horizontal de l'écran.
// URL : ?duree=450  ?bare. Touches ← →.

(() => {
  const SCREENS = [
    { titre: "Data", href: "wrapup.html", fond: "clocks" },
    { titre: "Favoris", href: "favoris.html", fond: "hearts" },
    { titre: "Notation", href: "notation.html", fond: "stars" },
  ];
  const STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

  // d = +1 (écran suivant) ou -1 (précédent) : les deux écrans glissent ensemble.
  const enter = (d) => [{ translate: `${d * 100}% 0` }, { translate: "0 0" }];
  const leave = (d) => [{ translate: "0 0" }, { translate: `${-d * 100}% 0` }];

  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    duree: Number(params.get("duree")) || 450,
    index: 0,
    busy: false,
  };
  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const bar = $("bar");
  bar.hidden = params.has("bare");
  let front = $("view-a"), back = $("view-b");

  const fit = () => app.style.setProperty("--s", Math.min(app.clientWidth / 375, app.clientHeight / 812).toFixed(4));
  addEventListener("resize", fit);
  fit();

  const url = (i) => `${SCREENS[i].href}?bare&sansfond`;
  const PUSH = 420; // px/s : impulsion donnée aux formes au départ d'un glissement

  window.ShapesPhysics.init();
  window.ShapesPhysics.setVariant(SCREENS[0].fond);
  const loaded = (frame) => new Promise((res) => frame.addEventListener("load", res, { once: true }));
  front.src = url(0);

  async function go(d) {
    if (state.busy) return;
    state.busy = true;
    const next = (state.index + d + SCREENS.length) % SCREENS.length;
    back.hidden = false;
    back.style.zIndex = 2;
    front.style.zIndex = 1;
    const ready = loaded(back);
    back.src = url(next);
    await ready;
    try { await back.contentDocument.fonts.ready; } catch {}

    window.ShapesPhysics.setVariant(SCREENS[next].fond, { transition: true });
    window.ShapesPhysics.push(-d * PUSH); // les formes restent en arrière du mouvement
    const opts = { duration: reduced ? 1 : state.duree, fill: "both" , easing: STANDARD };
    await Promise.all([
      back.animate(enter(d), opts).finished,
      front.animate(leave(d), opts).finished,
    ]);
    front.getAnimations().forEach((a) => a.cancel());
    back.getAnimations().forEach((a) => a.cancel());
    front.hidden = true;
    front.removeAttribute("src");
    [front, back] = [back, front];
    state.index = next;
    state.busy = false;
    counter();
  }

  // ---------- Barre ----------
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Transitions entre écrans</h1>
    <p class="counter" id="counter"></p>
    <button type="button" class="replay" id="next">Écran suivant →</button>
    <button type="button" class="replay" id="prev">← Écran précédent</button>`;
  function counter() { $("counter").textContent = `Écran ${state.index + 1} / ${SCREENS.length} : ${SCREENS[state.index].titre}`; }
  counter();
  $("next").addEventListener("click", () => go(1));
  $("prev").addEventListener("click", () => go(-1));
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
})();
