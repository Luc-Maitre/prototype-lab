// Référence motion du labo, alignée sur la guideline Motion de Spark, avec ce que les labos utilisent en plus.
// Les valeurs des labos ne sont pas encore lues depuis ce fichier : en cas de changement, vérifier le labo concerné.

(() => {
  // Source : guideline « Motion » du design system Spark (Figma). Les courbes marquées `labo` n'y figurent pas.
  const GUIDE = [
    { nom: "Standard", token: "ease-standard", alias: "ease in out", bez: [0.2, 0, 0, 1], defaut: true,
      intention: "Défaut. Pour un élément qui traverse l'écran, ou qui apparaît / disparaît comme un menu.",
      usage: [["Fondu des textes", "favoris.html"], ["Étoiles", "notation.html"], ["Masque des textes de la Data card", "datacard.html"], ["Apparition d'une roue", "data.html"]] },
    { nom: "Decelerate", token: "ease-decelerate", alias: "ease out", bez: [0.05, 0.7, 0.1, 1],
      intention: "Part vite puis ralentit : un élément qui apparaît (toast, carte qui surgit) ou une transition entre écrans.",
      usage: [["Compteur à roues (défaut)", "data.html"]] },
    { nom: "Accelerate", token: "ease-accelerate", alias: "ease in", bez: [0.3, 0, 0.8, 0.15],
      intention: "Part lentement puis prend de la vitesse : un élément qui quitte l'écran (toast fermé par l'utilisateur).",
      usage: [["Chute du fond de formes", "shapes.html"]] },
    { nom: "Linear", token: "ease-linear", bez: [0, 0, 1, 1],
      intention: "Aucune accélération : pour ce que la physique n'affecte pas, par exemple une animation de chargement.",
      usage: [["Compteurs de Favoris et Notation", "favoris.html"]] },
  ];
  const BACK = [
    { nom: "Standard back", token: "ease-standard-back", bez: [0.54, -0.52, 0.29, 1.54], intention: "Rebond au départ et à l'arrivée.", usage: [] },
    { nom: "Decelerate back", token: "ease-decelerate-back", bez: [0.45, 1.45, 0.8, 1], intention: "Rebond à l'arrivée.", usage: [["Cœur qui se remplit (approchant : Pop)", "favoris.html"]] },
    { nom: "Accelerate back", token: "ease-accelerate-back", bez: [0.35, -0.47, 0.8, 0.15], intention: "Rebond au départ (anticipation).", usage: [] },
  ];
  const LABO = [
    { nom: "Symétrique", bez: [0.4, 0, 0.2, 1], intention: "Départ et arrivée progressifs, sans rebond.", usage: [["Tour de page", "pageturn.html"]] },
    { nom: "Ressort", bez: [0.34, 1.56, 0.64, 1], intention: "Dépasse puis revient : un objet qui se pose.", usage: [["Bloc orange et pastille de la Data card", "datacard.html"]] },
    { nom: "Pop", bez: [0.05, 0.9, 0.25, 1.35], intention: "Petit rebond rapide pour confirmer un geste.", usage: [["Cœur qui se remplit", "favoris.html"]] },
  ];
  const CURVES = [...GUIDE, ...BACK, ...LABO];
  CURVES.forEach((c) => { c.css = c.bez.join() === "0,0,1,1" ? "linear" : `cubic-bezier(${c.bez.join(", ")})`; });

  const PRINCIPES = [
    ["Rapide et efficace", "Une animation ne ralentit jamais, ni ne donne l'impression de chuter en performance : elle donne une sensation de vitesse et de fluidité."],
    ["Séduisante", "Elle crée de la convivialité et de l'attachement à la marque."],
    ["Feedback", "Elle sert l'expérience : faire comprendre les changements de l'interface, répondre aux actions, assurer une continuité."],
  ];
  const CATEGORIES = [
    ["Décorative", "Animation d'illustration (Lottie), décidée par le produit : célébrer, accueillir, attirer l'attention, rendre la marque plus visible. Répond à Feedback et Séduisante."],
    ["Fonctionnelle", "Micro-animation discrète déclenchée par l'utilisateur (clic, bascule) ou le système (notification). Répond à Rapide et efficace et à Feedback."],
  ];
  const DUREES = [
    { nom: "Short", ms: "50", pour: "Petites transitions utilitaires : case à cocher, radio, interrupteur." },
    { nom: "Medium", ms: "250", defaut: true, pour: "Transition qui traverse une zone moyenne de l'écran : menu déroulant, bottom sheet." },
    { nom: "Long", ms: "450", pour: "Grandes transitions expressives : expansion d'une carte." },
  ];
  const DUREES_LABO = [
    ["120 – 150 ms", "Changement d'état d'un détail (opacité).", "dans la guideline (Short)"],
    ["250 – 350 ms", "Réaction de composant : roue, cœur.", "dans la guideline (Medium)"],
    ["400 – 620 ms", "Entrée d'une pièce : fondu, pose du bloc, étoile.", "autour de Long"],
    ["900 – 1000 ms", "Tour de page, Data card entière.", "au-delà de Long"],
    ["1500 – 1600 ms", "Compteurs qui montent.", "au-delà de Long"],
  ];
  const EVENTS = ["after-delay", "on-click", "on-scroll", "on-drag", "while-hovering", "while-pressing", "mouse-enter", "mouse-leave", "mouse-down", "mouse-up"];
  const REGLES = [
    "Les transitions restent brèves : l'utilisateur les rencontre souvent, une durée longue agace.",
    "La durée s'adapte à la distance parcourue (ex. 350 ms pour un long trajet, 250 ms pour un court) et à la surface concernée.",
    "Un élément qui quitte l'écran peut être plus court qu'à l'entrée (toast : entrée 400 ms en decelerate-back, sortie ≈ 250 ms en accelerate).",
    "Entrée = decelerate, sortie = accelerate, déplacement ou apparition / disparition = standard.",
    "Accessibilité (WCAG 2.2.2, RGAA 13.1 / 13.8) : une animation décorative ne dure pas plus de 5 secondes ; au-delà, elle doit pouvoir être mise en pause.",
    "Respecter « réduire les animations » : on affiche l'état final directement.",
  ];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);

  // Tracé de la courbe : la marge verticale montre les rebonds (courbes « back »).
  function graph([x1, y1, x2, y2]) {
    const S = 56, P = 32, pt = (x, y) => `${(P + x * S).toFixed(1)},${(P + (1 - y) * S).toFixed(1)}`;
    const b = (a, c, t) => 3 * a * t * (1 - t) ** 2 + 3 * c * t * t * (1 - t) + t ** 3;
    const pts = Array.from({ length: 41 }, (_, i) => { const t = i / 40; return pt(b(x1, x2, t), b(y1, y2, t)); });
    return `<svg class="graph" viewBox="0 0 ${S + 2 * P} ${S + 2 * P}" aria-hidden="true">
      <rect x="${P}" y="${P}" width="${S}" height="${S}" class="g-box"/>
      <polyline points="${pts.join(" ")}" class="g-line"/>
    </svg>`;
  }
  let idx = 0;
  const card = (c) => `
    <article class="curve">
      <div class="curve-head">${graph(c.bez)}<div><h3>${c.nom}${c.defaut ? ' <em>défaut</em>' : ""}</h3>
        ${c.token ? `<code class="tok">${c.token}</code>` : ""}${c.alias ? ` <small>« ${c.alias} »</small>` : ""}<br><code>${c.css}</code></div></div>
      <div class="track"><i class="dot" data-i="${idx++}"></i></div>
      <p>${c.intention}</p>
      ${c.usage.length ? `<p class="usage">Dans le labo : ${c.usage.map(([t, href]) => `<a href="${href}">${t}</a>`).join(" · ")}</p>` : ""}
    </article>`;

  $("principes").innerHTML = PRINCIPES.map(([t, d], i) => `<li><strong>${i + 1}. ${t}</strong>${d}</li>`).join("");
  $("categories").innerHTML = CATEGORIES.map(([t, d]) => `<li><strong>${t}</strong>${d}</li>`).join("");
  $("curves-guide").innerHTML = GUIDE.map(card).join("");
  $("curves-back").innerHTML = BACK.map(card).join("");
  $("curves-labo").innerHTML = LABO.map(card).join("");
  $("durees").innerHTML = DUREES.map((d) => `<tr><th>${d.nom}${d.defaut ? " <em>défaut</em>" : ""}</th><td>${d.ms} ms</td><td>${d.pour}</td></tr>`).join("");
  $("durees-labo").innerHTML = DUREES_LABO.map(([ms, pour, rel]) => `<tr><th>${ms}</th><td>${pour}</td><td>${rel}</td></tr>`).join("");
  $("events").innerHTML = EVENTS.map((e) => `<code class="tok">${e}</code>`).join(" ");
  $("regles").innerHTML = REGLES.map((r) => `<li>${r}</li>`).join("");

  // Démo : un point traverse la piste avec la courbe, en boucle (sur clic seulement si « réduire les animations »).
  const dots = [...document.querySelectorAll(".dot")];
  let dur = 800, anims = [];
  function play() {
    anims.forEach((a) => a.cancel());
    anims = dots.map((d, i) => d.animate(
      [{ left: "0%" }, { left: "100%" }],
      { duration: reduced ? 1 : dur, easing: CURVES[i].css, fill: "both", delay: 250 }));
    if (!reduced) anims[0].finished.then(() => setTimeout(play, 700)).catch(() => {});
  }
  $("dur").addEventListener("change", (e) => { dur = Number(e.target.value); play(); });
  $("replay").addEventListener("click", play);
  play();
})();
