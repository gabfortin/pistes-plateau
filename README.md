# Pistes cyclables — Le Plateau

Carte interactive des pistes cyclables du Plateau-Mont-Royal (Montréal), construite avec [Leaflet.js](https://leafletjs.com/).

## Fonctionnement

Les pistes sont décrites dans un fichier Markdown (`pistes.md`) avec un format simple :

```markdown
## Nom de la piste
type: 6b
45.51483, -73.58465
45.53679, -73.56364
```

Chaque piste porte un type numéroté (1a à 8) qui détermine la couleur, l'épaisseur et le style de trait affiché sur la carte.

## Types de pistes

| Type | Description |
|------|-------------|
| 1a | Chaussée désignée |
| 1b | Chaussée désignée dans les deux sens |
| 2a | Chaussée désignée + bande cyclable en sens inverse |
| 2b | Chaussée désignée + bande cyclable en sens inverse (protégée) |
| 3a | Vélo rue unidirectionnelle |
| 3b | Vélo rue bidirectionnelle |
| 4a | Bande cyclable dans le sens des voitures seulement |
| 4b | Bande cyclable à sens inverse seulement |
| 5  | Bandes cyclables dans chaque direction |
| 6a | Piste bidirectionnelle |
| 6b | Piste bidirectionnelle protégée |
| 7  | Piste unidirectionnelle protégée |
| 8  | Deux pistes unidirectionnelles protégées |

## Utilisation

Ouvrir `index.html` dans un navigateur (via un serveur local, p. ex. `npx serve .`).

L'application tente de charger `pistes.md` automatiquement au démarrage. Si le fichier n'est pas trouvé, un bouton permet d'en charger un manuellement depuis le disque.

## Technologies

- [Leaflet](https://leafletjs.com/) — rendu de carte
- [leaflet-polylinedecorator](https://github.com/bbecquet/Leaflet.PolylineDecorator) — flèches directionnelles
- OpenStreetMap — fond de carte
