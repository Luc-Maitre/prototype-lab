# Médaille holographique

Labo de test d'une médaille avec un foil holographique en WebGL2. Le foil et la médaille (inclinaison 3D) réagissent au gyroscope sur mobile et à la souris sur desktop.

Le shader est le « Holographic foil » de Figma (WGSL), porté à l'identique en GLSL ES 3.0 (WebGL2, plus répandu que WebGPU sur iOS).

## Data simple

`data.html` : composant « Data simple » (Figma Wrap-up, node 6382:17215) avec le nombre qui défile comme un compteur à roues (animation reprise du wrap-up, tag `v1`). Les textes entre `[]` (label haut, nombre, label bas) se modifient dans la barre, ainsi que la courbe et la durée. Paramètres : `?haut= ?valeur= ?bas= ?duree= ?courbe=decelerate|standard|accelerate|linear`, `?t=0..1` fige l'animation à cet instant. Police : Nunito (Regular / Black).

## Formes physiques

`shapes.html` : les 4 variants du fond wrap-up (Figma, composant `_Background` 6382:14782 : horloges, étoiles, bulles, cœurs). Chaque variant a 3 formes (bleu, orange, pêche) qui se comportent comme dans le wrapup : ressort amorti + gravité de l'accéléromètre (mobile) ou de la souris (desktop), roulement des formes, houle ambiante, chute des anciennes formes et remontée des nouvelles au changement de variant. `?v=clocks|stars|bubbles|hearts`, `?debug`, `?bare`, `←` `→`. Sur iOS, la permission capteurs est demandée au premier tap. Les SVG viennent de Figma (`assets/backgrounds/`) et `node tools/build-shapes.mjs` régénère `js/shapes.js`.

## Lancer

```sh
python3 -m http.server
```

Puis ouvrir http://localhost:8000. Aucune dépendance, aucun build.

Pour tester le gyroscope sur téléphone, la page doit être servie en HTTPS (ou en `localhost`), et iOS demande une autorisation : bouton « Activer le gyroscope ».

## Paramètres d'URL

| Paramètre | Effet |
| --- | --- |
| `?debug` | affiche la source (souris / gyroscope) et l'inclinaison |
| `?bare` | masque la barre de contrôle |
| `?tilt=x,y` | fige l'inclinaison (valeurs de −1 à 1) |

## Structure

```
index.html, reveal.html, data.html, shapes.html   pages du labo
js/holo.js                shader du foil + gestion gyroscope / souris
js/data.js              compteur à roues de Data simple
js/physics.js           physique des formes (repris du wrapup)
js/shapes.js            formes générées (tools/build-shapes.mjs)
js/reveal.js              page de la médaille et barre de contrôle
css/                      styles
assets/medal-sceau.svg    forme de la médaille
assets/fonts/             Nunito et Nunito Sans (SIL Open Font License 1.1, voir OFL-*.txt)
```
