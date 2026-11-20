// Haptique des formes physiques : de très légères vibrations, comme des billes qui roulent dans le téléphone.
// Partagé par les pages qui ont le fond de formes (js/shapes-page.js, js/wrapup-transitions.js).
// Haptics.init({ bar, before, reduced, debug }) : ajoute le bouton « Vibrations » dans `bar` (avant `before`).

window.Haptics = (() => {
  function init({ bar, before = null, reduced = false, debug = false }) {
    // Haptique : de très légères vibrations, comme des billes qui roulent dans le téléphone.
    // - roulement : micro-pulsations dont le rythme suit la vitesse des formes ;
    // - choc : un peu plus net quand une forme repart dans l'autre sens à bonne vitesse (bille qui tape).
    // navigator.vibrate n'existe que sur Android (Chrome) et demande un premier tap sur la page ; pas sur iOS Safari.
    const canVibrate = typeof navigator.vibrate === "function";
    const haptics = { on: canVibrate && localStorage.getItem("shapes-haptics") !== "off", last: 0, prev: [] };
    const ROLL_MIN = 70;    // px/s : en dessous, les formes sont « posées », pas de vibration
    const ROLL_GAP = [190, 75]; // ms entre deux pulsations : vitesse ROLL_MIN → ROLL_FAST
    const ROLL_FAST = 600;  // px/s
    const PULSE = 9;        // ms : léger (en dessous de ~10 ms, beaucoup de moteurs ne démarrent pas)
    const IMPACT = 120;     // px/s : vitesse minimale avant inversion pour compter comme un choc
    function haptic(now) {
      const v = window.ShapesPhysics.velocities();
      let speed = 0, hit = 0;
      v.forEach((b, i) => {
        speed = Math.max(speed, Math.hypot(b.vx, b.vy));
        const p = haptics.prev[i];
        if (p) for (const [a, c] of [[p.vx, b.vx], [p.vy, b.vy]]) if (a * c < 0 && Math.abs(a) > IMPACT) hit = Math.max(hit, Math.abs(a));
      });
      haptics.prev = v;
      if (!haptics.on || document.hidden) return;
      if (hit && now - haptics.last > 70) { navigator.vibrate(hit > 350 ? 17 : 12); haptics.last = now; return; }
      if (speed < ROLL_MIN) return;
      const k = Math.min(1, (speed - ROLL_MIN) / (ROLL_FAST - ROLL_MIN));
      if (now - haptics.last > ROLL_GAP[0] + (ROLL_GAP[1] - ROLL_GAP[0]) * k) { navigator.vibrate(PULSE); haptics.last = now; }
    }
    if (!reduced) {
      const loop = (now) => { haptic(now); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    // Chrome n'autorise vibrate() qu'après un geste sur la page : le premier tap arme les vibrations.
    let armed = false;
    addEventListener("pointerdown", () => { if (!armed && haptics.on) { armed = true; navigator.vibrate?.(30); } }, { once: true });
    // ?debug : état des vibrations en bas à gauche (support, geste reçu, dernier retour de vibrate())
    if (debug) {
      const dbg = document.createElement("pre");
      dbg.className = "debug";
      dbg.style.bottom = "auto"; dbg.style.top = "auto"; dbg.style.right = "8px"; dbg.style.left = "auto";
      document.body.append(dbg);
      const rawVibrate = navigator.vibrate?.bind(navigator);
      let calls = 0, lastRet = "—";
      if (rawVibrate) navigator.vibrate = (p) => { calls++; lastRet = String(rawVibrate(p)); return lastRet === "true"; };
      setInterval(() => {
        dbg.textContent = `vibrate : ${canVibrate ? "supporté" : "NON supporté"}\n` +
          `geste reçu : ${navigator.userActivation ? (navigator.userActivation.hasBeenActive ? "oui" : "NON (touche la page)") : "?"}\n` +
          `activé : ${haptics.on ? "oui" : "non"} · appels : ${calls} · retour : ${lastRet}`;
      }, 200);
    }
    const hapBtn = document.createElement("button");
    hapBtn.type = "button";
    hapBtn.textContent = canVibrate ? "Vibrations : " + (haptics.on ? "oui" : "non") : "Vibrations indisponibles (Android seulement)";
    hapBtn.disabled = !canVibrate;
    hapBtn.addEventListener("click", () => {
      haptics.on = !haptics.on;
      localStorage.setItem("shapes-haptics", haptics.on ? "on" : "off");
      hapBtn.textContent = "Vibrations : " + (haptics.on ? "oui" : "non");
      if (haptics.on) navigator.vibrate(40); // test : si rien ne vibre ici, c'est un réglage du téléphone
    });
    if (before) before.before(hapBtn); else bar.append(hapBtn);

  }
  return { init };
})();
