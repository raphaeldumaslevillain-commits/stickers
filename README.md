# DBM — Stickers holographiques

Une visionneuse 3D sur fond noir pur, construite à partir des visuels du dépôt.

- Rotation à la souris ou au doigt ; zoom à la molette, par pincement ou avec les boutons.
- Quatre boutons œil indépendants : fond de planche, fonds perdus, CutContour et holographie.
- Masquer le fond pour afficher les 11 adhésifs. Cliquer un adhésif pour l’isoler ; « Tout afficher » revient à la collection.
- Navigation clavier : focaliser la visionneuse, flèches pour tourner, +/− pour zoomer. En mode sans fond, Entrée isole le premier sticker ; ←/→ parcourt les stickers. Échap revient à la collection.
- Holographie simulée par un shader de diffraction, selon l’orientation de la surface, la direction de la lumière et le point de vue. Le dos est mat ; les tranches ont une épaisseur.

## Ouvrir le site

Le site complet est dans `dist/`, sans compilation ni installation :

```sh
python3 -m http.server 4173 --directory dist
```

Puis ouvrir http://localhost:4173. Le fichier `index.html` à la racine permet aussi une publication GitHub Pages depuis la racine de la branche. Aucun service externe n’est appelé par le site : moteur 3D, polices et images sont embarqués.

## Fichiers

- `dist/app.js` : scène Three.js, matériaux, calques, interactions et commandes WebMCP optionnelles.
- `dist/style.css` : interface responsive et charte DBM.
- `dist/assets/` : images fournies, contours extraits et polices.
- `scripts/prepare-assets.py` : extraction des contours à partir du visuel avec CutContour. Dépendances : Pillow, numpy, opencv-python-headless.

L’A5 est représenté à 148 × 210 mm. Les PNG fournis sont utilisés comme références de présentation ; les marges isolées sont une visualisation des fonds perdus, pas un fichier de fabrication. Les teintes du film holographique sont une simulation visuelle, à comparer à un échantillon pour la production.

Three.js 0.180.0 est fourni sous licence MIT ; Be Vietnam Pro sous SIL Open Font License. Voir `dist/vendor/LICENSE-three.txt` et `dist/assets/OFL-font.txt`.
