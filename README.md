# Médaille holographique

Labo de test d'une médaille avec un foil holographique en WebGL2. Le foil et la médaille (inclinaison 3D) réagissent au gyroscope sur mobile et à la souris sur desktop.

Trois variantes du foil sont comparables dans `reveal.html` :

- **V1 · Fidèle Figma** : réglages de base, reflet qui suit l'inclinaison
- **V2 · Irisé** : reflets arc-en-ciel qui apparaissent en inclinant
- **V3 · Éclat** : reflet plus net et plus ample

Le shader est le « Holographic foil » de Figma (WGSL), porté à l'identique en GLSL ES 3.0 (WebGL2, plus répandu que WebGPU sur iOS).

## Lancer

```sh
python3 -m http.server
```

Puis ouvrir http://localhost:8000. Aucune dépendance, aucun build.

Pour tester le gyroscope sur téléphone, la page doit être servie en HTTPS (ou en `localhost`), et iOS demande une autorisation : bouton « Activer le gyroscope ».

## Paramètres d'URL

| Paramètre | Effet |
| --- | --- |
| `?v=figma\|irise\|eclat` | ouvre une variante |
| `?debug` | affiche la source (souris / gyroscope) et l'inclinaison |
| `?bare` | masque la barre de contrôle |
| `?tilt=x,y` | fige l'inclinaison (valeurs de −1 à 1) |

Touches `←` `→` : changer de variante.

## Structure

```
index.html, reveal.html   pages du labo
js/holo.js                shader du foil + gestion gyroscope / souris
js/reveal.js              variantes (presets) et barre de contrôle
css/                      styles
assets/medal-sceau.svg    forme de la médaille
assets/fonts/             Nunito et Nunito Sans (SIL Open Font License 1.1, voir OFL-*.txt)
```
