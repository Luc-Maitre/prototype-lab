// Accueil du labo : pour ajouter une entrée, ajouter une ligne dans ENTRIES (description sur une seule ligne).
(() => {
  const SECTIONS = ["Briques", "Transitions", "Assemblages", "Références"];
  const ENTRIES = [
    { cat: "Briques", href: "reveal.html", titre: "Médaille holographique", desc: "Foil holographique réactif au gyroscope / à la souris" },
    { cat: "Briques", href: "data.html", titre: "Data simple", desc: "Nombre qui défile comme un compteur à roues" },
    { cat: "Briques", href: "favoris.html", titre: "Favoris", desc: "Compteur de 0 à N et grille de cœurs qui se remplit" },
    { cat: "Briques", href: "notation.html", titre: "Notation", desc: "Compteur de 0 à 4.9 et étoiles qui se remplissent" },
    { cat: "Briques", href: "datacard.html", titre: "Data card", desc: "Cartouche, bloc orange à découpe et pastille calendrier" },
    { cat: "Briques", href: "shapes.html", titre: "Formes physiques", desc: "Formes du fond qui bougent avec le gyroscope / la souris" },
    { cat: "Transitions", href: "pageturn.html", titre: "Page turn", desc: "Tour de page depuis le coin inférieur droit" },
    { cat: "Transitions", href: "wrapup-transitions.html", titre: "Transitions entre écrans", desc: "Glissement d'un écran au suivant, fond physique continu" },
    { cat: "Assemblages", href: "wrapup.html", titre: "Écran Wrap-up", desc: "Data simple, puis Data card, sur les formes physiques" },
    { cat: "Références", href: "motion.html", titre: "Motion", desc: "Courbes, durées et règles d'intention" },
  ];
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  document.getElementById("list").innerHTML = SECTIONS.map((cat) => {
    const items = ENTRIES.filter((e) => e.cat === cat);
    if (!items.length) return "";
    return `<section><h2>${cat}</h2>${items
      .map((e) => `<a class="card" href="${e.href}"><strong>${esc(e.titre)}</strong><span>${esc(e.desc)}</span></a>`)
      .join("")}</section>`;
  }).join("");
})();
