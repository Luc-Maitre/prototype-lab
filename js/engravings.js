// Gravures des médailles : tracés vectoriels (1ʳᵉ proposition de chaque médaille)
// rastérisés dans un canvas, que le shader du foil (js/holo.js) lit comme une carte de hauteur.
//
// Engravings.render(id) → canvas carré (côté = Engravings.SIZE en points du design, centré sur le sceau)

window.Engravings = (() => {
  const SIZE = 250;   // côté de la carte, en points (le tracé en occupe ~215)
  const FIT = 215;    // taille du tracé (plus grand côté), en points
  const PX = 3;       // pixels de la carte par point
  const STROKE = 4.5; // épaisseur du trait, en points

  const f = (n) => Math.round(n * 100) / 100;
  const circle = (cx, cy, r) => {
    const k = 0.5523 * r;
    return `M ${cx} ${cy - r} C ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} C ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} Z`;
  };
  const spark = (cx, cy, r) =>
    `M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`;
  const star = (cx, cy, R, r) => {
    let s = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      s += `${i ? "L" : "M"} ${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))} `;
    }
    return s + "Z";
  };

  // Tracés dans une boîte de 200 × 200
  const rosette = () => {
    let s = "";
    const n = 16;
    for (let i = 0; i <= n * 8; i++) {
      const a = (i / (n * 8)) * Math.PI * 2;
      const rr = 52 + 4 * Math.cos(a * n);
      s += `${i ? "L" : "M"} ${f(100 + rr * Math.cos(a))} ${f(85 + rr * Math.sin(a))} `;
    }
    return `${s}Z ${circle(100, 85, 38)} ${star(100, 85, 24, 10)} M 72 125 L 55 185 L 82 170 L 94 192 L 100 132 M 128 125 L 145 185 L 118 170 L 106 192 L 100 132`;
  };
  const PATHS = {
    // gold : rosette
    gold: rosette(),
    // blue : diamant
    blue: `M 60 60 L 140 60 L 170 95 L 100 170 L 30 95 Z M 30 95 L 170 95 M 60 60 L 75 95 L 100 170 M 140 60 L 125 95 L 100 170 M 75 95 L 100 60 L 125 95 ${spark(165, 35, 14)} ${spark(35, 40, 9)}`,
    // purple : fusée
    purple: `M 100 20 C 130 50 135 100 125 135 L 75 135 C 65 100 70 50 100 20 Z ${circle(100, 75, 12)} M 75 110 L 50 140 L 50 165 L 75 135 M 125 110 L 150 140 L 150 165 L 125 135 M 85 135 L 85 148 L 115 148 L 115 135 M 92 156 Q 100 190 108 156`,
    // pink : pousse
    pink: `M 100 175 L 100 95 M 100 125 C 60 130 40 100 40 68 C 75 68 100 88 100 125 Z M 100 98 C 100 58 130 32 170 32 C 170 72 140 98 100 98 Z M 50 175 L 150 175 M 65 175 Q 100 160 135 175 ${circle(32, 40, 3)} ${circle(165, 150, 3)}`,
  };

  const cache = {};
  function render(id) {
    if (cache[id]) return cache[id];
    const d = PATHS[id];
    if (!d) return null;
    const side = SIZE * PX;
    const c = document.createElement("canvas");
    c.width = c.height = side;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const path = new Path2D(d);
    const paint = (scale, ox, oy) => {
      ctx.clearRect(0, 0, side, side);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.lineWidth = STROKE * PX / scale; // épaisseur constante quelle que soit l'échelle
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff";
      ctx.stroke(path);
    };
    // 1) mesure l'emprise réelle du tracé, 2) le recadre et le centre à FIT points
    paint(side / 220, side / 22, side / 22);
    const px = ctx.getImageData(0, 0, side, side).data;
    let x0 = side, y0 = side, x1 = 0, y1 = 0;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      if (px[(y * side + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const k0 = side / 220;
    const bw = (x1 - x0) / k0, bh = (y1 - y0) / k0;           // emprise en unités du tracé
    const k = (FIT * PX) / Math.max(bw, bh);                  // échelle finale (px par unité)
    const cx = (x0 + x1) / 2 / k0 - 10, cy = (y0 + y1) / 2 / k0 - 10; // centre en unités du tracé
    paint(k, side / 2 - cx * k, side / 2 - cy * k);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return (cache[id] = c);
  }

  return { SIZE, render, ids: Object.keys(PATHS) };
})();
