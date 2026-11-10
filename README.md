# Pistes cyclables — Le Plateau

Carte interactive des pistes cyclables du Plateau-Mont-Royal (Montréal), par
type d'aménagement, avec les intersections dangereuses. Pour les cyclistes et
pour qui veut voir où le réseau est protégé ou non.

**En ligne :** [pistes.gabfortin.com](https://pistes.gabfortin.com)

## Contenu

| Élément | Ce qu'il fait |
|---|---|
| **Carte** | Fond OpenStreetMap centré sur le Plateau ; épaisseur des tracés et taille des cercles ajustées au zoom ; flèches sur les types à sens unique (1a, 3a, 4a, 4b, 7) |
| **Légende** | Construite à partir des définitions de types, pistes et intersections |
| **Panneau latéral** | Liste cliquable des pistes et des intersections : un clic recentre la carte et ouvre le popup ; repliable (burger) sur mobile |
| **Intersections dangereuses** | Marqueurs circulaires avec popup descriptif et liste dédiée |
| **Chargement manuel** | Boutons pour charger `pistes.md` et `intersections.md` depuis le disque si le chargement automatique échoue |

Mode sombre selon l'appareil : les couleurs des types ne changent pas (elles
font la légende), un halo clair (`--line-halo`) garde visibles les tracés
foncés (6b, 8).

## Données

### Sources

| Source | Producteur | Utilisée pour |
|---|---|---|
| `pistes.md`, `intersections.md` | Relevé de Gabriel Fortin, écrit à la main | Tracés des pistes et intersections dangereuses |
| [OpenStreetMap](https://www.openstreetmap.org) | Contributeurs d'OpenStreetMap, ODbL | Fond de carte |

### Mise à jour

**À la main** : modifier `pistes.md` ou `intersections.md`, puis pousser sur
`main`. La carte lit ces fichiers sur GitHub à chaque visite. Format des
fichiers et définition des types : [DONNEES.md](DONNEES.md).

### Mises en garde

- Le classement des aménagements en types est celui de ce projet, pas une
  classification officielle.
- Initiative indépendante : ni produite ni approuvée par l'arrondissement ni
  par la Ville de Montréal.

## Utilisation locale

```bash
python3 -m http.server 8000   # http://localhost:8000
```

En local aussi, les données sont lues sur GitHub : pour essayer une
modification avant de la pousser, utiliser les boutons de chargement manuel.

## Architecture

| Fichier | Rôle |
|---|---|
| `index.html` | Page de la carte |
| `confidentialite.html` | Politique de confidentialité (avec mode sombre) |
| `app.js` | Carte Leaflet, lecture des fichiers Markdown, légende, panneau, définitions des types |
| `style.css` | Jetons du `:root`, redéfinis pour le mode sombre |
| `pistes.md`, `intersections.md` | Données (voir [DONNEES.md](DONNEES.md)) |
| `types-pistes.md` | Liste de référence des types de pistes |
| `favicon.svg`, `apple-touch-icon.png` | Icônes |

Carte au [système de design des cartes](../MAP-DESIGN-SYSTEM.md), section
« Mode sombre » comprise. `package.json` ne sert qu'à `npx serve .`, une autre
façon de lancer un serveur local : aucune dépendance npm.

## Publication

GitHub Pages, branche `main`, domaine dans `CNAME`. (Ce site n'a pas encore
le numéro de version x.y.z des autres sites.)

## Confidentialité

Aucun cookie ni compte.

| Quand | Ce qui est envoyé | À qui |
|---|---|---|
| Chaque visite | Page, site d'origine, appareil, pays | GoatCounter (mesure d'audience anonyme) |
| Chaque visite | Lecture de `pistes.md` et `intersections.md` | GitHub (`raw.githubusercontent.com`) |
| Chaque visite | Leaflet et son extension de flèches | unpkg |
| Carte | Requêtes de tuiles de la zone affichée | OpenStreetMap |

Les fichiers chargés avec les boutons « Charger » restent dans le navigateur.
Détails : [confidentialite.html](confidentialite.html), à mettre à jour (avec
sa date) si un service externe est ajouté.

## Crédits

- [Leaflet](https://leafletjs.com) 1.9.4 (BSD-2-Clause) et
  [leaflet-polylinedecorator](https://github.com/bbecquet/Leaflet.PolylineDecorator)
  1.6.0 (MIT), chargés depuis unpkg
- Fond de carte © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL)

## Auteur

Développé par [Gabriel Fortin](https://gabfortin.com).

## Documentation détaillée

| Fichier | Contenu |
|---|---|
| [DONNEES.md](DONNEES.md) | Format de `pistes.md` et `intersections.md`, types de pistes et d'intersections |
| [types-pistes.md](types-pistes.md) | Liste de référence des types de pistes |
