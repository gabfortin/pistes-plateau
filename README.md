# Pistes cyclables — Le Plateau

Carte interactive des pistes cyclables du Plateau-Mont-Royal (Montréal), construite avec [Leaflet.js](https://leafletjs.com/).

Disponible en ligne : [pistes.gabfortin.com](https://pistes.gabfortin.com)

## Fonctionnement

Les données sont décrites dans deux fichiers Markdown distincts (`pistes.md` et `intersections.md`), chargés automatiquement au démarrage depuis le dépôt GitHub. En cas d'échec, des boutons permettent de charger les fichiers manuellement depuis le disque. Les définitions de types sont documentées dans `types-pistes.md`.

### Pistes (`pistes.md`)

```markdown
## Nom de la piste
type: 6b
45.51483, -73.58465
45.53679, -73.56364
```

### Intersections dangereuses (`intersections.md`)

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

## Fonctionnalités

- **Carte interactive** — fond OpenStreetMap, vue centrée sur le Plateau-Mont-Royal
- **Légende dynamique** — construite automatiquement depuis les définitions de types, incluant pistes et intersections
- **Panneau latéral** — liste cliquable des pistes et des intersections ; cliquer sur un élément recentre la carte et ouvre le popup
- **Intersections dangereuses** — marqueurs circulaires sur la carte, avec popup descriptif et liste dédiée dans le panneau
- **Mise à l'échelle au zoom** — épaisseur des polylignes et rayon des cercles s'ajustent dynamiquement selon le niveau de zoom
- **Interface responsive** — sur mobile, le panneau latéral se ferme/ouvre via un bouton burger, avec un overlay de fond
- **Chargement de fichiers** — boutons séparés pour charger manuellement `pistes.md` et `intersections.md`

## Mode sombre

La carte suit le mode clair ou sombre de l'appareil, selon la recette commune des cartes (`~/Developer/MAP-DESIGN-SYSTEM.md`, section « Mode sombre »). Toutes les couleurs de surface et de texte passent par les jetons du `:root` de `style.css`, redéfinis dans le bloc `@media (prefers-color-scheme: dark)`. Les couleurs des types de pistes ne changent pas (elles font la légende) : en sombre, un halo clair (`--line-halo`) garde visibles les tracés foncés (6b, 8). La page de confidentialité a aussi son mode sombre.

## Technologies

- [Leaflet](https://leafletjs.com/) — rendu de carte
- [leaflet-polylinedecorator](https://github.com/bbecquet/Leaflet.PolylineDecorator) — flèches directionnelles
- OpenStreetMap — fond de carte
- [GoatCounter](https://www.goatcounter.com) — statistiques de visite anonymes, sans cookies

## Confidentialité

Aucun cookie ni compte. Les fichiers chargés avec les boutons « Charger » restent
dans le navigateur. Détails : [confidentialite.html](confidentialite.html), à mettre
à jour (avec sa date) si un service externe est ajouté.
