# Données — Pistes cyclables du Plateau

Les données de la carte sont écrites à la main dans deux fichiers Markdown du
dépôt, `pistes.md` et `intersections.md`. La carte les charge au démarrage
depuis GitHub (`raw.githubusercontent.com`, branche `main`) : une modification
poussée sur `main` apparaît sans autre étape. Si ce chargement échoue, des
boutons permettent de charger les fichiers depuis le disque.

Les couleurs et libellés des types sont définis dans `app.js` ; leur liste de
référence est [types-pistes.md](types-pistes.md).

## Pistes (`pistes.md`)

```markdown
## Nom de la piste
type: 6b
45.51483, -73.58465
45.53679, -73.56364
```

## Intersections dangereuses (`intersections.md`)

```markdown
## Nom de l'intersection
type: 1
45.52446, -73.58951
```

## Types de pistes

| Type | Description |
|------|-------------|
| 1a | Chaussée désignée |
| 1b | Chaussée désignée dans les deux sens |
| 1c | Trottoir permettant la circulation à vélo |
| 2a | Chaussée désignée + bande cyclable en sens inverse |
| 2b | Chaussée désignée + bande cyclable en sens inverse (protégée) |
| 3a | Vélo rue unidirectionnelle |
| 3b | Vélo rue bidirectionnelle |
| 4a | Bande cyclable dans le sens des voitures seulement |
| 4b | Bande cyclable à sens inverse seulement |
| 5a | Bandes cyclables dans chaque direction, collées sur stationnement |
| 5b | Bandes cyclables dans chaque direction, sans stationnement, ou avec espacement |
| 5c | Bandes cyclables dans chaque direction, avec une certaine protection |
| 6a | Piste bidirectionnelle |
| 6b | Piste bidirectionnelle protégée |
| 6c | Piste bidirectionnelle partagée avec piétons |
| 7  | Piste unidirectionnelle protégée |
| 8  | Deux pistes unidirectionnelles protégées |

Les types à sens unique (1a, 3a, 4a, 4b, 7) affichent des flèches directionnelles sur la carte.

## Types d'intersections dangereuses

| Type | Description |
|------|-------------|
| 1 | Intersection non gérée |
| 2 | Absence de cycle protégé |
