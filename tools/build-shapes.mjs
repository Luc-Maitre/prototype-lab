// Construit js/shapes.js depuis les SVG exportés de Figma (assets/backgrounds/*.svg), composant _Background
// : variants Clocks, Stars, Message bubbles, Hearts, Tags, Coins, Followers. Chaque variant = 3 formes indépendantes
// (bleu, orange, pêche) pour la physique. Repère : écran 375 × 812, formes ancrées en bas.
// Géométrie reprise du code Figma (positions « bottom » converties en y depuis le haut).
//
// Usage : node tools/build-shapes.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const H = 812;
const PAD = 2;
const read = (f) => readFileSync(join(root, "assets/backgrounds", `${f}.svg`), "utf8");
const round = (v) => Math.round(v * 1000) / 1000;
const ROLE = { "#CFE0F2": "blue", "#EC5A13": "orange", "#F9C7A8": "peach" };

const inner = (src, prefix) =>
  src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}-${id.replace(/\W/g, "_")}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);

const wrap = (x, y, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${round(w)}" height="${round(h)}" viewBox="${round(x)} ${round(y)} ${round(w)} ${round(h)}" fill="none">${body}</svg>`;

// Forme tournée : fichier de taille (W × H) tourné de `rot`° autour du centre de son cadre (wx, wy, ww, wh).
function rotated(variant, i, file, [wx, wy, ww, wh], rot, W, Hh) {
  const src = read(file);
  const role = roleOf(src);
  const cx = wx + ww / 2, cy = wy + wh / 2;
  const x = wx - PAD, y = wy - PAD, w = ww + 2 * PAD, h = wh + 2 * PAD;
  const g0 = inner(src, `${variant}${i}`);
  const g = `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${rot}) translate(${-W / 2} ${-Hh / 2})">${hands(g0, src)}</g>`;
  return { body: role, mode: "roll", x: round(x), y: round(y), w: round(w), h: round(h), cx: round(cx), cy: round(cy), r: round(Math.sqrt(W * Hh) / 2), svg: wrap(x, y, w, h, g) };
}

// Couleur de la forme : premier remplissage bleu / orange / pêche du fichier.
const roleOf = (src) => [...src.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => ROLE[m[1].toUpperCase()]).find(Boolean);

// Horloges : les aiguilles sont enveloppées dans <g data-hand="hours|minutes" data-px data-py> (pivot = centre
// du bout arrondi de l'aiguille des heures) ; js/shapes-page.js les fait tourner.
function hands(markup, rawSrc) {
  const hours = rawSrc.match(/<path id="hours[^"]*" d="([^"]+)"/);
  if (!hours) return markup;
  const pts = points(hours[1]);
  const xs = pts.map((p) => p[0]);
  const px = round((Math.min(...xs) + Math.max(...xs)) / 2), py = round(pts[0][1]);
  return markup.replace(/<path id="[^"]*-(hours|minutes)[^"]*"[^>]*\/>/g,
    (m, kind) => `<g data-hand="${kind}" data-px="${px}" data-py="${py}">${m}</g>`);
}

// Chemin Figma : commandes absolues M L H V C Z.
function points(d) {
  const pts = [];
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let cmd = null, x = 0, y = 0, i = 0;
  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) { cmd = tokens[i++]; if (cmd === "Z") continue; }
    if (cmd === "H") { x = +tokens[i++]; pts.push([x, y, true]); }
    else if (cmd === "V") { y = +tokens[i++]; pts.push([x, y, true]); }
    else if (cmd === "C") for (let k = 0; k < 3; k++) { x = +tokens[i++]; y = +tokens[i++]; pts.push([x, y, k === 2]); }
    else { x = +tokens[i++]; y = +tokens[i++]; pts.push([x, y, true]); }
  }
  return pts;
}

// Fichier à 3 tracés (stars, hearts) posé en (ox, oy) : un corps par tracé.
function paths(variant, file, ox, oy) {
  const src = read(file);
  return [...src.matchAll(/<path id="[^"]*" d="([^"]+)" fill="([^"]+)"\/>/g)].map((m, i) => {
    const pts = points(m[1]);
    const verts = pts.filter((p) => p[2]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
    let a = 0, gx = 0, gy = 0;
    for (let k = 0; k < verts.length; k++) {
      const [x0, y0] = verts[k], [x1, y1] = verts[(k + 1) % verts.length];
      const f = x0 * y1 - x1 * y0;
      a += f; gx += (x0 + x1) * f; gy += (y0 + y1) * f;
    }
    a /= 2; gx /= 6 * a; gy /= 6 * a;
    const x = ox + minX - PAD, y = oy + minY - PAD, w = maxX - minX + 2 * PAD, h = maxY - minY + 2 * PAD;
    const body = `<path d="${m[1]}" fill="${m[2]}" transform="translate(${round(ox)} ${round(oy)})"/>`;
    return { body: ROLE[m[2].toUpperCase()], mode: "roll", x: round(x), y: round(y), w: round(w), h: round(h),
      cx: round(ox + gx), cy: round(oy + gy), r: round(Math.sqrt(Math.abs(a) / Math.PI)), svg: wrap(x, y, w, h, body) };
  });
}

// Aire signée et centroïde du premier sous-tracé (contour extérieur, sans les trous).
function outline(d) {
  const verts = points(d.split("Z")[0]).filter((p) => p[2]);
  let a = 0, gx = 0, gy = 0;
  for (let k = 0; k < verts.length; k++) {
    const [x0, y0] = verts[k], [x1, y1] = verts[(k + 1) % verts.length];
    const f = x0 * y1 - x1 * y0;
    a += f; gx += (x0 + x1) * f; gy += (y0 + y1) * f;
  }
  return { a: Math.abs(a / 2), gx: gx / (3 * a), gy: gy / (3 * a) };
}

// Fichier dont chaque enfant de _Background (tracé seul ou groupe : étiquette + traits, tête + buste)
// est une forme, posé en (ox, oy). Rayon et centre de roulement : tracés colorés (pas les détails blancs).
function groups(variant, file, ox, oy) {
  const src = read(file).replace(/^[\s\S]*?<g id="_Background">/, "").replace(/<\/g>\s*<\/svg>\s*$/, "");
  return [...src.matchAll(/<path[^>]*\/>|<g[^>]*>[\s\S]*?<\/g>/g)].map(([el]) => {
    const ps = [...el.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*fill="([^"]+)"/g)].map((m) => ({ d: m[1], role: ROLE[m[2].toUpperCase()] }));
    const xs = [], ys = [];
    for (const p of ps) for (const [x, y] of points(p.d)) { xs.push(x); ys.push(y); }
    let A = 0, GX = 0, GY = 0;
    for (const p of ps.filter((p) => p.role)) { const o = outline(p.d); A += o.a; GX += o.gx * o.a; GY += o.gy * o.a; }
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const x = ox + minX - PAD, y = oy + minY - PAD, w = maxX - minX + 2 * PAD, h = maxY - minY + 2 * PAD;
    const body = `<g transform="translate(${round(ox)} ${round(oy)})">${el.replace(/ id="[^"]*"/g, "")}</g>`;
    return { body: ps.find((p) => p.role).role, mode: "roll", x: round(x), y: round(y), w: round(w), h: round(h),
      cx: round(ox + GX / A), cy: round(oy + GY / A), r: round(Math.sqrt(A / Math.PI)), svg: wrap(x, y, w, h, body) };
  });
}

const out = {
  clocks: [
    rotated("clocks", 0, "clock-1", [135.165, H - 200 + 32.66, 200, 200], 0, 200, 200),
    rotated("clocks", 2, "clock-3", [-112, H - 381.843 + 213.92, 381.843, 381.843], -20, 297.916, 297.916),
    rotated("clocks", 1, "clock-2", [180.98, H - 235.416 + 159, 235.416, 235.416], 3, 224, 224),
  ],
  stars: paths("stars", "stars", -0.2273 * 375, H - 295),
  bubbles: [
    rotated("bubbles", 0, "bubble-1", [-41.19, H - 264.144 + 68.83, 263.085, 264.144], -4, 246.417, 247.558),
    rotated("bubbles", 1, "bubble-2", [121.64, H - 283.197 + 5.46, 283.133, 283.197], 42.23, 200, 200.926),
    rotated("bubbles", 2, "bubble-3", [103.46, H - 315.988 + 137.33, 315.71, 315.988], 34.23, 226.817, 227.867),
  ],
  hearts: paths("hearts", "hearts", -0.2349 * 375, H - 273),
  tags: groups("tags", "tags", -0.0854 * 375, H - 273),
  coins: [
    rotated("coins", 0, "coin-1", [166.48, H - 182.055 - 5.14, 182.055, 182.055], 1.57, 177.26, 177.26),
    rotated("coins", 1, "coin-2", [-45.17, H - 295.009 + 134.65, 295.009, 295.009], -15, 240.874, 240.874),
    rotated("coins", 2, "coin-3", [151.83, H - 280.126 + 154.88, 280.126, 280.126], 16.99, 224.354, 224.354),
  ],
  followers: groups("followers", "followers", -0.0997 * 375, H - 273),
};

writeFileSync(join(root, "js/shapes.js"),
  "// Généré par tools/build-shapes.mjs depuis assets/backgrounds/*.svg (Figma) — ne pas éditer.\n" +
  `window.SHAPES = ${JSON.stringify(out, null, 1)};\n`);
for (const [v, s] of Object.entries(out)) console.log(v, s.map((o) => `${o.body} @${o.x},${o.y} ${o.w}×${o.h} r${o.r}`));
