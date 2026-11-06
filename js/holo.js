// Foil holographique réactif (gyroscope sur mobile, souris sur desktop).
// Le shader est le « Holographic foil » du Figma (WGSL) porté à l'identique en GLSL ES 3.0 (WebGL2,
// plus répandu que WebGPU sur iOS), + les lignes ondulées du calque « Sceau » du dessus (« Wavy thin lines »).
// Les seules additions : `uShift` (décale les bandes du foil) et la position du reflet, pilotés par l'inclinaison.
//
// Holo.create({ canvas, sealCenter:[x,y], preset }) → { setPreset, resize, tilt, source, recalibrate, requestSensors }

window.Holo = (() => {
  const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uPx;          // taille du canvas en pixels
uniform vec2 uDims;        // taille du canvas en points (repère du design)
uniform vec2 uSealCenter;  // centre du sceau en points
uniform vec3 uTint;
uniform float uRainbow, uHue, uScale, uDir, uDist, uShift, uIntensity, uSoft, uLineInk;
uniform vec2 uHl;          // position du reflet, en %
out vec4 outColor;

float foilHash(vec2 p) {
  vec2 q = fract(p * vec2(123.34, 456.21));
  vec2 r = q + dot(q, q + vec2(45.32));
  return fract(r.x * r.y);
}
float foilNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(foilHash(cell), foilHash(cell + vec2(1.0, 0.0)), w.x),
             mix(foilHash(cell + vec2(0.0, 1.0)), foilHash(cell + vec2(1.0)), w.x), w.y);
}
vec3 foilSpectrum(float h) {
  vec3 phase = 6.2831853 * (h + vec3(0.0, 0.6666667, 0.3333333));
  return pow(0.5 + 0.5 * cos(phase), vec3(0.8));
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uPx.x, 1.0 - gl_FragCoord.y / uPx.y);
  float aspect = uDims.x / uDims.y;
  float angle = uDir * 0.01745329252;
  vec2 axis = vec2(cos(angle), sin(angle));
  vec2 crossAxis = vec2(-axis.y, axis.x);
  vec2 plane = (uv - vec2(0.5)) * vec2(aspect, 1.0);
  vec2 p = vec2(dot(plane, axis), dot(plane, crossAxis)) / uScale;
  float n = foilNoise(p * 2.7 + vec2(4.1, 1.6));
  float warp = uDist * (0.22 * sin(p.y * 6.4 + n * 3.0) + 0.31 * (n - 0.5) + 0.07 * sin(p.x * 8.0 - p.y * 4.0));
  float fold = p.x + warp + uShift;
  float wave = sin(fold * 10.8 + 0.7 * sin(p.y * 3.0));
  float slope = cos(fold * 10.8 + 0.7 * sin(p.y * 3.0));
  float spectralPhase = fold * 1.65 + 0.12 * sin(p.y * 4.5) * uDist + uHue / 360.0;
  vec3 spectral = foilSpectrum(spectralPhase);
  vec3 secondary = foilSpectrum(spectralPhase * 0.52 + 0.16);
  vec3 rainbow = mix(spectral, secondary, 0.17);
  vec3 bodyColor = mix(uTint, rainbow * (0.68 + uTint * 0.32), uRainbow);
  float metal = 0.33 + 0.38 * (0.5 + 0.5 * wave) + 0.21 * pow(abs(slope), 5.0);
  vec2 lightDelta = (uv - uHl / 100.0) * vec2(aspect, 1.0);
  float lightRadius = mix(0.13, 0.85, uSoft);
  float lightField = exp(-dot(lightDelta, lightDelta) / (lightRadius * lightRadius));
  float sharpness = mix(44.0, 4.0, uSoft);
  float reflectedBand = pow(clamp(0.5 + 0.5 * slope, 0.0, 1.0), sharpness);
  float highlight = uIntensity * (0.56 * lightField + reflectedBand * (0.18 + 0.78 * lightField));
  float fineGrain = (foilNoise(uv * uDims / 0.7) - 0.5) * 0.018;
  vec3 reflectedColor = mix(vec3(1.0), uTint, 0.23);
  vec3 color = bodyColor * metal + reflectedColor * highlight + vec3(fineGrain);

  // Lignes ondulées (Wavy thin lines : angle 36°, pas 5, amplitude 8.5, période 131, épaisseur 0.9)
  vec2 lp = uv * uDims - uSealCenter;
  float th = 36.0 * 0.01745329252;
  float along = dot(lp, vec2(cos(th), sin(th)));
  float across = dot(lp, vec2(-sin(th), cos(th)));
  float displaced = across - 8.5 * sin(along * 6.28318530718 / 131.0);
  float cycle = fract(displaced / 5.0 + 0.5) - 0.5;
  float dist = abs(cycle) * 5.0;
  float aa = max(fwidth(displaced) * 0.5, 0.001);
  float cov = 1.0 - smoothstep(max(0.45 - aa, 0.0), 0.45 + aa, dist);
  color *= 1.0 - cov * uLineInk;

  outColor = vec4(clamp(color, vec3(0.0), vec3(1.0)), 1.0);
}`;

  // Réglages du Figma (calque Foil) ; `tilt` = amplitude de la réaction à l'inclinaison (−1…1).
  const FIGMA = {
    tint: [1, 0.6371611952781677, 0.46071213483810425],
    rainbow: 0, hue: 0, scale: 1.04, dir: 94, dist: 1.28, intensity: 1.3, soft: 0.6, hl: [32, 24],
    lineInk: 0.07,
    tilt: { hl: 28, shift: 0.35, dir: 8, hue: 0, rainbow: 0 },
  };

  const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

  function create({ canvas, sealCenter, preset = {}, onTilt }) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) { canvas.hidden = true; return null; }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (name) => gl.getUniformLocation(prog, name);

    let cfg = { ...FIGMA, ...preset, tilt: { ...FIGMA.tilt, ...preset.tilt } };
    let w = 1, h = 1;
    const cur = { x: 0, y: 0 };   // inclinaison lissée
    const target = { x: 0, y: 0 };
    let source = "aucune";
    let dirty = true;

    function resize(scale = 1) {
      const r = Math.min(window.devicePixelRatio || 1, 2) * Math.min(Math.max(scale, 1), 2);
      w = canvas.clientWidth || canvas.width;
      h = canvas.clientHeight || canvas.height;
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
      gl.viewport(0, 0, canvas.width, canvas.height);
      dirty = true;
    }

    function draw() {
      const t = cfg.tilt;
      gl.uniform2f(U("uPx"), canvas.width, canvas.height);
      gl.uniform2f(U("uDims"), w, h);
      gl.uniform2f(U("uSealCenter"), sealCenter[0], sealCenter[1]);
      gl.uniform3fv(U("uTint"), cfg.tint);
      gl.uniform1f(U("uRainbow"), clamp(cfg.rainbow + t.rainbow * Math.hypot(cur.x, cur.y), 0, 1));
      gl.uniform1f(U("uHue"), cfg.hue + t.hue * cur.x);
      gl.uniform1f(U("uScale"), cfg.scale);
      gl.uniform1f(U("uDir"), cfg.dir + t.dir * cur.x);
      gl.uniform1f(U("uDist"), cfg.dist);
      gl.uniform1f(U("uShift"), t.shift * (cur.x + 0.5 * cur.y));
      gl.uniform1f(U("uIntensity"), cfg.intensity);
      gl.uniform1f(U("uSoft"), cfg.soft);
      gl.uniform2f(U("uHl"), cfg.hl[0] + t.hl * cur.x, cfg.hl[1] + t.hl * cur.y);
      gl.uniform1f(U("uLineInk"), cfg.lineInk);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      onTilt?.(cur.x, cur.y);
    }

    // ---------- Entrées : gyroscope ou souris ----------

    let base = null;       // inclinaison de repos du téléphone (1ʳᵉ mesure)
    let lastGyro = 0;
    let pinned = false;    // ?tilt=x,y : inclinaison figée (captures, comparaisons)
    const GYRO_RANGE = 25; // ° d'inclinaison pour atteindre ±1

    function onOrientation(e) {
      if (pinned || e.gamma == null || e.beta == null) return;
      if (!base) base = { beta: e.beta, gamma: e.gamma };
      lastGyro = performance.now();
      source = "gyroscope";
      target.x = clamp((e.gamma - base.gamma) / GYRO_RANGE);
      target.y = clamp((e.beta - base.beta) / GYRO_RANGE);
    }
    addEventListener("deviceorientation", onOrientation);

    const stage = canvas.closest(".app") || document.body;
    function onPointer(e) {
      if (pinned || performance.now() - lastGyro < 1000) return;
      const r = stage.getBoundingClientRect();
      source = "souris";
      target.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
      target.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1);
    }
    addEventListener("pointermove", onPointer);
    document.documentElement.addEventListener("pointerleave", () => {
      if (source === "souris") { target.x = 0; target.y = 0; }
    });

    // iOS : le capteur demande une autorisation, à déclencher depuis un geste.
    const needsPermission = typeof window.DeviceOrientationEvent?.requestPermission === "function" && navigator.maxTouchPoints > 0;
    async function requestSensors() {
      if (!needsPermission) return true;
      try { return (await DeviceOrientationEvent.requestPermission()) === "granted"; } catch { return false; }
    }

    // ---------- Boucle (ne dessine que si ça bouge) ----------

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const k = 1 - Math.exp(-dt / 0.09);
      const dx = target.x - cur.x, dy = target.y - cur.y;
      if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
        cur.x += dx * k; cur.y += dy * k;
        dirty = true;
      }
      if (dirty) { draw(); dirty = false; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      resize,
      setPreset(p) { cfg = { ...FIGMA, ...p, tilt: { ...FIGMA.tilt, ...p.tilt } }; dirty = true; },
      pin(x, y) { pinned = true; source = "fixe"; target.x = x; target.y = y; },
      recalibrate() { base = null; target.x = 0; target.y = 0; },
      requestSensors,
      needsPermission,
      get state() { return { source, x: cur.x, y: cur.y }; },
    };
  }

  return { create };
})();
