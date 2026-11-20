# Médaille holographique

Labo de test d'une médaille avec un foil holographique en WebGL2. Le foil et la médaille (inclinaison 3D) réagissent au gyroscope sur mobile et à la souris sur desktop.

Le shader est le « Holographic foil » de Figma (WGSL), porté à l'identique en GLSL ES 3.0 (WebGL2, plus répandu que WebGPU sur iOS).

## Data simple

`data.html` : composant « Data simple » avec le nombre qui défile comme un compteur à roues. Les textes entre `[]` (label haut, nombre, label bas) se modifient dans la barre, ainsi que la courbe et la durée. Paramètres : `?haut= ?valeur= ?bas= ?duree= ?courbe=decelerate|standard|accelerate|linear`, `?t=0..1` fige l'animation à cet instant. Police : Nunito (Regular / Black).

## Favoris

`favoris.html` : écran « Favoris », un compteur à roues (celui de Data simple, courbe linéaire, 1600 ms) qui monte de 0 à N pendant qu'une grille de cœurs se remplit, un cœur par incrément. Le lien est déclaratif (`data-count-to`, `data-count-sync`, événement `wrapup:count`). Chaque cœur a une case fixe ; le nombre de colonnes est calculé une fois d'après le total (min. 6, jusqu'à 30 : celui qui donne les plus gros cœurs, donc la largeur occupée quand le total grandit) et c'est la grille entière qui dézoome et se recentre à chaque incrément. Accroche, compteur (1 à 999 999 999 ; la grille s'arrête à 100 cœurs, le compteur continue) et unité se modifient dans la barre. Paramètres : `?haut= ?valeur= ?bas= ?duree= ?bare`. Le fond est la forme physique « cœurs » de la page Formes physiques (gyroscope / souris). Respecte `prefers-reduced-motion` (état final direct).

## Notation

`notation.html` : écran « Notation », un compteur à roues (celui de Favoris, de 0 à la note en dixièmes, courbe linéaire) et 5 étoiles de 52 px sur le fond « étoiles » physique (les formes de Formes physiques : gyroscope sur mobile, souris sur desktop). Animation **Remplissage** : les étoiles vides se remplissent de gauche à droite au rythme du compteur, puis une vague de pulsation. L'étoile partielle est à l'échelle de la note (3,5 = 3 pleines + 1 à 50 % de la largeur de la forme), le reste de l'étoile reste vide. Paramètres : `?note=4.9 ?haut= ?bas= ?duree= ?t=0..1 ?bare`. Respecte `prefers-reduced-motion`.

## Data card

`datacard.html` : composant « Data card » (cartouche incliné de -5°, bloc orange avec découpe, pastille calendrier), sans photo, sur le fond « horloges » physique. Animation d'entrée **Empilement** : le bloc monte, le cartouche tombe et se pose, les textes se révèlent par un masque, la pastille s'enclenche. Cartouche, grand nombre et petit texte se modifient dans la barre. Paramètres : `?label= ?big= ?small= ?duree=1000 ?t=0..1 ?bare`. Respecte `prefers-reduced-motion` (état final direct). Assets Figma dans `assets/datacard/`.

## Formes physiques

`shapes.html` : les 4 variants du fond (horloges, étoiles, bulles, cœurs). Chaque variant a 3 formes (bleu, orange, pêche) qui se comportent comme dans le proto d'origine : ressort amorti + gravité de l'accéléromètre (mobile) ou de la souris (desktop), roulement des formes, houle ambiante, chute des anciennes formes et remontée des nouvelles au changement de variant. `?v=clocks|stars|bubbles|hearts`, `?debug`, `?bare`, `←` `→`. Sur iOS, la permission capteurs est demandée au premier tap. Les SVG viennent de Figma (`assets/backgrounds/`) et `node tools/build-shapes.mjs` régénère `js/shapes.js`.

## Écran Wrap-up

`wrapup.html` : orchestration d'un écran complet du template Figma « Wrap-up » (Data simple en haut, puis Data card, sur les formes physiques). L'ordre est fixe : le compteur de la Data simple défile, puis la Data card entre (empilement) après une pause. Les composants sont ceux de `data.html` et `datacard.html`, pilotés en mode `window.WRAPUP` (pas de barre ni de lecture automatique dans `js/data.js` / `js/datacard.js`) ; `js/wrapup.js` enchaîne la séquence. Positions du Figma : Data simple en (24, 112), Data card calée sur le bas à y≈519. Exemple : « Bravo ! Vous avez publié **12** annonces cette année », puis « Meilleure vente **320 €** un vélo de ville ». Paramètres : `?haut= ?valeur= ?bas= ?label= ?big= ?small= ?fond=clocks|stars|bubbles|hearts ?pause=50 ?bare`. Respecte `prefers-reduced-motion`.

## Page turn

`pageturn.html` : l'écran orange se tourne depuis le coin inférieur droit (petit coin replié de 64 px au repos, comme la maquette) et révèle l'écran suivant (fond d'horloges). Le pli est la médiatrice entre le coin d'origine et le coin tiré ; la page du dessus est découpée (`clip-path`) et la partie découpée est retournée autour du pli pour faire le dos de la page. Le coin file en diagonale vers le coin opposé (pli à 45°). On peut tirer le coin au doigt / à la souris (au-delà d'un seuil ou d'un geste lancé, le tour se termine ; sinon le coin revient), le toucher, ou utiliser « Tourner la page ». Paramètres : `?duree=900`, `?c=x,y` (fige le coin), `?bare`. Touches `←` `→`.

## Transitions entre écrans

`wrapup-transitions.html` : passage d'un écran au suivant (Data → Favoris → Notation) en glissement horizontal (courbe Standard, 450 ms). Le page turn est réservé à deux cas : intro → premier écran, et reveal → écran d'avant. Les écrans sont les pages du labo chargées en `?bare` dans deux cadres ; l'écran entrant est rechargé à chaque passage, donc son animation d'entrée rejoue pendant la transition. Le fond de formes physiques appartient à la page (horloges, cœurs, étoiles selon l'écran) : il ne coupe pas (les formes du nouveau fond remontent, celles de l'ancien tombent) et, au glissement, il reçoit une impulsion horizontale (`ShapesPhysics.push`) qui le fait traîner derrière le mouvement puis revenir. Les écrans sont chargés avec `?sansfond` (transparents, sans physique propre : géré dans `js/physics.js` et `css/base.css`). « Écran précédent » inverse le sens. Les vibrations des formes physiques (`js/haptics.js`, partagé avec `shapes.html`) sont reprises, avec le même bouton « Vibrations ». Paramètres : `?duree=450`, `?bare`. Touches `←` `→`. Respecte `prefers-reduced-motion` (changement direct).

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
index.html, reveal.html, data.html, favoris.html, notation.html, datacard.html, shapes.html, pageturn.html, wrapup.html, wrapup-transitions.html   pages du labo
js/holo.js                shader du foil + gestion gyroscope / souris
js/notation.js          compteur à roues + étoiles de Notation
js/favoris.js           compteur à roues + grille de cœurs de Favoris
js/wrapup.js            orchestration de l'écran Wrap-up
js/data.js              compteur à roues de Data simple
js/physics.js           physique des formes
js/shapes.js            formes générées (tools/build-shapes.mjs)
js/reveal.js              page de la médaille et barre de contrôle
css/                      styles
assets/medal-sceau.svg    forme de la médaille
assets/fonts/             Nunito et Nunito Sans (SIL Open Font License 1.1, voir OFL-*.txt)
```
