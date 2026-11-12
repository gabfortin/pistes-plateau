# Données — Pistes cyclables du Plateau

Les données de la carte sont écrites à la main dans trois fichiers JSON à la
racine du dépôt. La carte les lit sur le site lui-même (GitHub Pages) à chaque
visite, sans cache (`cache: 'no-cache'`) : une modification poussée sur `main`
apparaît dès que Pages a republié le site (environ une minute). Si le
chargement échoue, des boutons du panneau permettent de charger les fichiers
depuis le disque (pratique aussi pour essayer une modification avant de la
pousser).

| Fichier | Contenu | Vue |
|---|---|---|
| `pistes.json` | Pistes actuelles (construites) | « Actuel », « À venir » ; « Mandat » si `annee` est dans le mandat |
| `a-venir.json` | Pistes adoptées en conseil, pas encore construites | « À venir » ; « Mandat » si `prevu` est dans le mandat |
| `intersections.json` | Intersections dangereuses | « Actuel » et « À venir » |

**Vue « Mandat 2025-2029 »** : seulement les pistes construites (`annee`) ou
prévues (`prevu`) de **2026 à 2029**. Le mandat a commencé avec l'élection du
2 novembre 2025, après la saison des travaux : une piste de 2025 relève du
mandat précédent. Ces bornes sont dans la constante `MANDAT` d'`app.js` (à
changer pour le prochain mandat).

Coordonnées : `[latitude, longitude]` en degrés décimaux (WGS 84), comme
copiées depuis Google Maps ou OpenStreetMap. Une piste a au moins deux points ;
une piste qui en a moins est ignorée.

Les couleurs et libellés des types sont définis dans `app.js` ; leur liste de
référence est [types-pistes.md](types-pistes.md).

Les fichiers `pistes.md` et `intersections.md` de l'ancien format ont été
convertis le 12 novembre 2026, sans perte (98 pistes, 10 intersections,
coordonnées recopiées telles quelles) ; ils restent dans l'historique git.

## Pistes actuelles (`pistes.json`)

`annee` (facultatif) : année de construction, affichée « Construite en » dans
le popup et utilisée par la vue « Mandat ». Inconnue pour les pistes plus
anciennes : à ajouter au moins pour celles construites depuis 2026.

```json
[
  {
    "nom": "Rachel",
    "type": "6b",
    "annee": 2026,
    "coords": [
      [45.53677537792469, -73.56357518298049],
      [45.53049901769098, -73.56953199308438]
    ]
  }
]
```

## Pistes à venir (`a-venir.json`)

Mêmes champs, plus des champs facultatifs :

```json
[
  {
    "nom": "Nom de la piste",
    "type": "6b",
    "prevu": 2027,
    "adoption": "2026-06-02",
    "source": "Résolution CA26 25 0123",
    "remplace": ["Nom d'une piste actuelle"],
    "coords": [
      [45.5300, -73.5800],
      [45.5250, -73.5750]
    ]
  }
]
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `nom`, `type`, `coords` | oui | Comme pour les pistes actuelles. `type` = l'aménagement prévu |
| `prevu` | non | Année de construction prévue, affichée « Construction prévue » dans le popup |
| `trace` | non | Provenance du tracé quand il ne vient pas du relevé (ex. axe de la rue dans la Géobase) ; non affiché |
| `adoption` | non | Date d'adoption en conseil (`AAAA-MM-JJ`), affichée « 2 juin 2026 » dans le popup |
| `source` | non | Résolution ou document ; une adresse `https://…` devient un lien « Voir » |
| `remplace` | non | Noms exacts de pistes de `pistes.json` que ce projet remplace : masquées dans la vue « À venir » |

Une piste à venir est dessinée avec le style de son type et un halo violet
pointillé ; elle a sa propre liste dans le panneau. Quand elle est construite,
la déplacer de `a-venir.json` vers `pistes.json` en renommant `prevu` en
`annee` (l'année réelle de construction : on la garde pour la vue « Mandat »)
et sans les autres champs facultatifs (`trace` peut rester) et retirer de `pistes.json` les pistes qu'elle remplaçait.

## Intersections dangereuses (`intersections.json`)

```json
[
  { "nom": "Hôtel-de-Ville / Saint-Joseph", "type": "1", "coord": [45.52446224086117, -73.58951577938262] }
]
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

Les types à sens unique (1a, 3a, 4a, 4b, 7) affichent des flèches
directionnelles sur la carte, dans l'ordre des points de `coords`.

## Types d'intersections dangereuses

| Type | Description |
|------|-------------|
| 1 | Intersection non gérée |
| 2 | Absence de cycle protégé |
