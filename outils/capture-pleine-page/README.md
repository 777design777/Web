# Capture pleine page

Prend la capture d’écran **entière** d’une page web, y compris des pages
« dynamiques » qui ne chargent leur contenu qu’au fur et à mesure qu’on
descend (défilement infini, images chargées à la demande, blocs qui
apparaissent au défilement…).

Avant la capture, l’outil :

1. défile la page écran par écran jusqu’en bas, avec la molette, comme un visiteur ;
2. attend à chaque pas que le réseau se calme (fin des chargements) ;
3. une fois en bas, remonte un peu puis redescend, et recommence tant que la page
   grandit — il ne s’arrête que lorsque le bas a été atteint **3 fois de suite**
   sans nouveau contenu ;
4. force le chargement des images « paresseuses » restantes et attend qu’elles
   soient toutes affichées ;
5. remonte en haut puis capture la page sur toute sa hauteur.

Il gère aussi les sites qui défilent dans un bloc interne (et non sur la page) :
le bloc est déplié à sa hauteur réelle pour la capture.

## Installation (une seule fois)

Il faut [Node.js](https://nodejs.org) (version 18 ou plus). Dans ce dossier :

```
npm install
```

(ce qui télécharge aussi le navigateur Chromium utilisé pour les captures).

## Utilisation avec l’interface

```
npm run interface
```

puis ouvrir http://localhost:3000 dans le navigateur, coller l’adresse et
cliquer sur « Capturer la page ». La progression s’affiche, puis l’aperçu et
le lien de téléchargement.

## Utilisation en ligne de commande

```
node capture.js https://exemple.fr
node capture.js exemple.fr page.jpg --largeur 1920 --echelle 2
node capture.js exemple.fr page.pdf
node capture.js exemple.fr --mobile --cliquer "text=Tout accepter"
node capture.js exemple.fr --masquer "#cookie-banner, .chat-widget"
```

Formats : `.png` (défaut), `.jpg` (plus léger) ou `.pdf` (une seule page, très haute).

| Option | Rôle | Défaut |
| --- | --- | --- |
| `--largeur N` | largeur de la fenêtre en px | 1440 |
| `--mobile` | affichage iPhone (390 px, Retina) | — |
| `--echelle N` | densité de pixels (2 = Retina) | 1 |
| `--pause N` | attente après chaque défilement, en ms | 800 |
| `--tours N` | fois où le bas doit être atteint sans nouveau contenu | 3 |
| `--duree-max N` | durée maximale du défilement, en secondes | 120 |
| `--hauteur-max N` | hauteur maximale de la capture, en px | 60000 |
| `--attente N` | attente avant la capture, en ms | 1000 |
| `--cliquer "sél"` | clic avant de défiler (bandeau cookies…) | — |
| `--masquer "sél"` | éléments à cacher sur la capture | — |
| `--chromium chemin` | utiliser un Chromium déjà installé | — |

## Conseils

- **Il manque encore du contenu en bas ?** Le site est lent : augmenter
  `--pause` (ex. `--pause 2000`) et/ou `--tours`.
- **Défilement infini sans fin** (réseaux sociaux, fils d’actualité) : la capture
  s’arrête à `--hauteur-max` ou au bout de `--duree-max`.
- **Bandeau de cookies sur la capture** : `--cliquer "text=Accepter"` (le texte
  exact du bouton) ou `--masquer` avec le sélecteur CSS du bandeau.
- Les pages qui demandent une connexion (compte, espace client) ne peuvent pas
  être capturées : le navigateur de l’outil n’est connecté à aucun compte.
