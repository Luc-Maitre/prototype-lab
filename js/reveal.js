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
  // Variants du composant Figma « Medal » (Profil = Gold / Blue / Purple). Gold = réglages Figma d'origine ;
  // Blue et Purple : seule la teinte du foil change (valeurs estimées d'après les captures du composant).
  const VARIANTS = {
    gold: { label: "Gold", preset: {} },
    blue: { label: "Blue", preset: { tint: [0.45, 0.82, 0.95] } },
    purple: { label: "Purple", preset: { tint: [0.62, 0.55, 0.96] } },
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
    <button type="button" data-act="calibrate">Recalibrer (gyroscope)</button>`;
  bar.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.variant) {
      holo?.setPreset(VARIANTS[b.dataset.variant].preset);
      bar.querySelectorAll("[data-variant]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      return;
    }
    if (b.dataset.act === "calibrate") holo?.recalibrate();
    if (b.dataset.act === "sensors" && (await holo.requestSensors())) b.remove();
  });
})();
