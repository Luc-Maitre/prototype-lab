// Labo « reveal » : médaille avec plusieurs versions du foil holographique.
// Le foil et la médaille (3D) réagissent au gyroscope (mobile) ou à la souris (desktop). ?v=<id> ouvre une version, ?debug affiche l'inclinaison.
// Touches : ← → changent de version.

const VERSIONS = [
  { id: "figma",  nom: "V1 · Fidèle Figma", note: "Réglages du calque Foil, reflet qui suit l'inclinaison",
    preset: {}, rot: 12 },
  { id: "irise",  nom: "V2 · Irisé",        note: "Reflets arc-en-ciel qui apparaissent en inclinant",
    preset: { tilt: { rainbow: 0.7, hue: 160, shift: 0.5 } } },
  { id: "eclat",  nom: "V3 · Éclat",        note: "Reflet plus net et plus ample",
    preset: { intensity: 1.9, soft: 0.3, tilt: { hl: 36, shift: 0.45 } } },
];

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
  let rot = 12; // ° d'inclinaison 3D de la médaille à ±1 (selon la version)
  const holo = window.Holo.create({
    canvas,
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

  function select(id) {
    const v = VERSIONS.find((x) => x.id === id) || VERSIONS[0];
    holo?.setPreset(v.preset);
    rot = v.rot;
    bar.querySelectorAll("button[data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v.id)));
    history.replaceState(null, "", `?v=${v.id}${params.has("debug") ? "&debug" : ""}`);
  }

  const sensorBtn = holo?.needsPermission
    ? `<button type="button" class="replay" data-act="sensors">Activer le gyroscope</button>` : "";
  bar.innerHTML = `<a class="back" href="index.html">← Labo</a><h1>Reveal</h1>
    ${VERSIONS.map((v) => `<button type="button" data-v="${v.id}">${v.nom}<small>${v.note}</small></button>`).join("")}
    ${sensorBtn}
    <button type="button" data-act="calibrate">Recalibrer (gyroscope)</button>`;
  bar.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v) select(b.dataset.v);
    if (b.dataset.act === "calibrate") holo?.recalibrate();
    if (b.dataset.act === "sensors" && (await holo.requestSensors())) b.remove();
  });
  addEventListener("keydown", (e) => {
    const i = VERSIONS.findIndex((v) => bar.querySelector(`[data-v="${v.id}"]`).getAttribute("aria-pressed") === "true");
    if (e.key === "ArrowRight") select(VERSIONS[(i + 1) % VERSIONS.length].id);
    if (e.key === "ArrowLeft") select(VERSIONS[(i + VERSIONS.length - 1) % VERSIONS.length].id);
  });

  select(params.get("v"));
})();
