// Labo « reveal » : médaille avec foil holographique.
// Le foil et la médaille (3D) réagissent au gyroscope (mobile) ou à la souris (desktop). ?debug affiche l'inclinaison.

(() => {
  const params = new URLSearchParams(location.search);
  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  if (params.has("bare")) bar.hidden = true;

  const fit = () => {
    const s = Math.min(app.clientWidth / 375, app.clientHeight / 812);
    app.style.setProperty("--s", s.toFixed(4));
    return s;
  };

  const canvas = document.getElementById("foil");
  // Centre du sceau dans le repère du canvas (= foil Figma décalé de (−48.52, −30))
  const medal = document.getElementById("medal");
  const rot = 12; // ° d'inclinaison 3D de la médaille à ±1
  // Variants du composant Figma « Medal » : seuls la teinte de base (baseTint) et la saturation arc-en-ciel changent.
  const VARIANTS = {
    gold: { label: "gold", title: "Grand", subtitle: "bravo", preset: {} },
    blue: { label: "blue", title: "Belle", subtitle: "trouvaille", preset: { rainbow: 0.25, tint: [0.14901961386203766, 0.4588235318660736, 0.658823549747467] } },
    purple: { label: "purple", title: "Départ", subtitle: "fulgurant", preset: { rainbow: 0.25, tint: [0.4627451002597809, 0.32156863808631897, 0.7215686440467834] } },
    pink: { label: "pink", title: "Jeune", subtitle: "talent", preset: { rainbow: 0.25, tint: [0.7254902124404907, 0.30980393290519714, 0.47058823704719543] } },
  };
  const variant = VARIANTS[params.get("variant")] ? params.get("variant") : "gold";
  const holo = window.Holo.create({
    canvas,
    preset: VARIANTS[variant].preset,
    sealCenter: [48.52 + 163.5, 30 + 163.5],
    onTilt: (x, y) => {
      medal.style.setProperty("--rx", `${(-y * rot).toFixed(2)}deg`);
      medal.style.setProperty("--ry", `${(x * rot).toFixed(2)}deg`);
    },
  });
  // Gravure (propositions Figma, 1ʳᵉ de chaque médaille) : un tracé par variant, affichable ou non
  let engrave = params.get("gravure") !== "0";
  const setEngraving = (id) => {
    holo?.setEngraving(window.Engravings.render(id), window.Engravings.SIZE);
    holo?.showEngraving(engrave);
  };
  setEngraving(variant);
  // Titre sur 2 lignes (modifiable)
  const top = document.getElementById("mt-top"), bottom = document.getElementById("mt-bottom");
  top.textContent = params.get("l1") ?? VARIANTS[variant].title;
  bottom.textContent = params.get("l2") ?? VARIANTS[variant].subtitle;
  // Titre rendu dans le shader (pour qu'il prenne le foil) : 2 lignes dessinées dans un canvas centré sur la médaille
  const TXT = { w: 300, h: 140, px: 3 };
  const tcv = document.createElement("canvas");
  tcv.width = TXT.w * TXT.px; tcv.height = TXT.h * TXT.px;
  const renderTitle = () => {
    const ctx = tcv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, tcv.width, tcv.height);
    ctx.scale(TXT.px, TXT.px);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Cadre « Title » du Figma : 259 × 106 à (34, 110,5) dans la médaille 327 ; ici l'origine est à (13,5 ; 93,5)
    const lines = [[top.textContent, "#ec5a13", 110.5 + 29 - 93.5], [bottom.textContent, "#152233", 110.5 + 48 + 29 - 93.5]];
    for (const [text, color, y] of lines) {
      let size = 48;
      ctx.font = `900 ${size}px Nunito, sans-serif`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${(-0.03 * size).toFixed(2)}px`;
      const w = ctx.measureText(text).width;
      if (w > 259) { size = 48 * 259 / w; ctx.font = `900 ${size}px Nunito, sans-serif`; if ("letterSpacing" in ctx) ctx.letterSpacing = `${(-0.03 * size).toFixed(2)}px`; }
      ctx.fillStyle = color;
      ctx.fillText(text, TXT.w / 2, y + 2);
    }
    holo?.setText(tcv, TXT.w, TXT.h);
  };
  document.fonts.load("900 48px Nunito").then(renderTitle);
  const refit = () => holo?.resize(fit());
  addEventListener("resize", refit);
  refit();

  const pin = (params.get("tilt") || "").split(",").map(Number);
  if (holo && pin.length === 2 && pin.every(Number.isFinite)) holo.pin(...pin);

  const debug = document.createElement("pre");
  debug.className = "debug";
  debug.hidden = !params.has("debug");
  document.body.append(debug);
  if (holo && params.has("debug")) {
    setInterval(() => {
      const s = holo.state;
      debug.textContent = `source ${s.source}\nx ${s.x.toFixed(2)}  y ${s.y.toFixed(2)}`;
    }, 100);
  }

  const sensorBtn = holo?.needsPermission
    ? `<button type="button" class="replay" data-act="sensors">Activer le gyroscope</button>` : "";
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Reveal</h1>
    ${sensorBtn}
    <div class="variants">${Object.entries(VARIANTS).map(([k, v]) =>
      `<button type="button" data-variant="${k}" aria-pressed="${k === variant}">${v.label}</button>`).join("")}</div>
    <label>[Top]<input id="in-l1" type="text" value="${top.textContent.replace(/"/g, "&quot;")}"></label>
    <label>[Bottom]<input id="in-l2" type="text" value="${bottom.textContent.replace(/"/g, "&quot;")}"></label>
    <label class="switch"><input type="checkbox" id="in-gravure"${engrave ? " checked" : ""}> Gravure</label>
    <button type="button" data-act="calibrate">Recalibrer (gyroscope)</button>`;
  bar.querySelector("#in-l1").addEventListener("input", (e) => { top.textContent = e.target.value; renderTitle(); });
  bar.querySelector("#in-l2").addEventListener("input", (e) => { bottom.textContent = e.target.value; renderTitle(); });
  const $gravure = bar.querySelector("#in-gravure");
  $gravure.addEventListener("change", (e) => { engrave = e.target.checked; holo?.showEngraving(engrave); });
  bar.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.variant) {
      holo?.setPreset(VARIANTS[b.dataset.variant].preset);
      setEngraving(b.dataset.variant);
      // Le titre par défaut suit la médaille (remplace le texte saisi)
      top.textContent = bar.querySelector("#in-l1").value = VARIANTS[b.dataset.variant].title;
      bottom.textContent = bar.querySelector("#in-l2").value = VARIANTS[b.dataset.variant].subtitle;
      renderTitle();
      bar.querySelectorAll("[data-variant]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      return;
    }
    if (b.dataset.act === "calibrate") holo?.recalibrate();
    if (b.dataset.act === "sensors" && (await holo.requestSensors())) b.remove();
  });
})();
