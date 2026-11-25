// Labo « Data + Data card » : orchestration d'un écran = Data simple, puis Data card, sur les formes physiques.
// Ordre fixe : le compteur de la Data simple défile, puis la Data card entre (empilement) une fois qu'il est arrivé.
// Les composants viennent de js/data.js et js/datacard.js (mode window.WRAPUP). Fond : js/physics.js.
// URL : ?haut= ?valeur= ?bas= ?label= ?big= ?small= ?fond=clocks|stars|bubbles|hearts|tags|coins|followers ?pause=50 ?bare

(() => {
  const { data, card } = window.WRAPUP;
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAMES = { clocks: "Horloges", stars: "Étoiles", bubbles: "Bulles", hearts: "Cœurs", tags: "Étiquettes", coins: "Pièces", followers: "Abonnés" };
  const $ = (id) => document.getElementById(id);
  const bar = $("bar");
  bar.hidden = params.has("bare");

  // Données de l'exemple (le Figma dit « 5 objets » / « 840 € » : ici d'autres valeurs)
  Object.assign(data.state, {
    haut: params.get("haut") ?? "Bravo ! Vous avez publié",
    valeur: (params.get("valeur") ?? "12").replace(/\D/g, "") || "0",
    bas: params.get("bas") ?? "annonces cette année",
  });
  Object.assign(card.state, {
    label: params.get("label") ?? "Meilleure vente",
    big: params.get("big") ?? "320 €",
    small: params.get("small") ?? "un vélo de ville",
  });
  let pause = Number(params.get("pause") ?? 50); // ms entre la fin du compteur et l'entrée de la carte

  // Fond
  window.ShapesPhysics.init();
  const ids = window.ShapesPhysics.variants();
  const fond = ids.includes(params.get("fond")) ? params.get("fond") : "clocks";
  window.ShapesPhysics.setVariant(fond);

  // ---------- Séquence ----------
  let timer = 0;
  function play() {
    clearTimeout(timer);
    card.root.classList.remove("is-shown");
    data.renderLabels();
    card.setTexts();
    data.play();
    const showCard = () => { card.root.classList.add("is-shown"); card.play(); };
    if (reduced) showCard();
    else timer = setTimeout(showCard, data.delay + data.state.duree + pause);
  }

  // ---------- Barre ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Data + Data card</h1>
    <label>[Top label]<input id="in-haut" type="text" value="${esc(data.state.haut)}"></label>
    <label>[1234]<input id="in-valeur" type="text" inputmode="numeric" value="${esc(data.state.valeur)}"></label>
    <label>[bottom label]<input id="in-bas" type="text" value="${esc(data.state.bas)}"></label>
    <label>[Label carte]<input id="in-label" type="text" value="${esc(card.state.label)}"></label>
    <label>[Big]<input id="in-big" type="text" value="${esc(card.state.big)}"></label>
    <label>[Small]<input id="in-small" type="text" value="${esc(card.state.small)}"></label>
    <label>Formes<select id="in-fond">${ids.map((id) => `<option value="${id}"${id === fond ? " selected" : ""}>${NAMES[id] ?? id}</option>`).join("")}</select></label>
    <label>Pause avant la carte (ms)<input id="in-pause" type="number" min="0" step="50" value="${pause}"></label>
    <button type="button" class="replay" id="replay">Rejouer</button>`;

  let later = 0;
  const replaySoon = () => { clearTimeout(later); later = setTimeout(play, 400); };
  $("in-haut").addEventListener("input", (e) => { data.state.haut = e.target.value; data.renderLabels(); });
  $("in-bas").addEventListener("input", (e) => { data.state.bas = e.target.value; data.renderLabels(); });
  $("in-valeur").addEventListener("input", (e) => { data.state.valeur = e.target.value.replace(/\D/g, "").slice(0, 9) || "0"; replaySoon(); });
  $("in-label").addEventListener("input", (e) => { card.state.label = e.target.value; card.setTexts(); });
  $("in-big").addEventListener("input", (e) => { card.state.big = e.target.value; card.setTexts(); });
  $("in-small").addEventListener("input", (e) => { card.state.small = e.target.value; card.setTexts(); });
  $("in-fond").addEventListener("change", (e) => window.ShapesPhysics.setVariant(e.target.value, { transition: true }));
  $("in-pause").addEventListener("change", (e) => { pause = Math.max(0, Number(e.target.value) || 0); });
  $("replay").addEventListener("click", play);

  document.fonts.ready.then(play);
})();
