# Gallup & Locard — site vitrine

Site statique (HTML / CSS / JavaScript vanilla) destiné à https://galluplocard.fr.
Aucun framework, aucune dépendance externe, aucun cookie, aucun traceur.
Poids total : environ 2 Mo.

## Structure

```
/
├── index.html             accueil (un seul écran)
├── projets.html           liste des projets (une carte par projet)
├── projets/
│   ├── isis.html          page du projet ISIS
│   └── voyage-en-gaule.html  page du projet Voyage en Gaule
├── esprit.html            L’esprit Gallup & Locard
├── a-propos.html          À propos
├── mentions-legales.html  mentions légales
├── 404.html               page d’erreur
├── robots.txt
├── sitemap.xml
├── .htaccess              HTTPS, cache, compression, sécurité (Apache / OVH)
├── css/
│   ├── style.css          tous les styles (sections numérotées et commentées)
│   └── nojs.css           complément si JavaScript est désactivé
├── js/
│   └── main.js            menu mobile, visionneuse d’images, animations
└── assets/
    ├── fonts/             Fraunces + Instrument Sans (auto-hébergées, licence OFL)
    └── images/
        ├── isis/
        ├── gaule/
        ├── future-projects/   (vide, prêt pour la suite)
        ├── favicon.svg, apple-touch-icon.png
        └── og-galluplocard.jpg (aperçu pour les réseaux sociaux)
```

L’en-tête (menu), la section Contact et le pied de page sont identiques sur toutes
les pages. Pour les modifier, il faut faire la même modification dans chaque fichier
`.html`. Le lien « Contact » du menu fait descendre à la section Contact de la page.

## Tester le site sur un ordinateur

1. Décompressez l’archive `galluplocard-site.zip`.
2. Ouvrez le dossier `galluplocard-site`, puis double-cliquez sur **`index.html`** :
   le site s’ouvre dans votre navigateur, sans connexion ni installation.

Tout fonctionne ainsi (navigation, galeries, visionneuse, version mobile via le mode
« responsive » du navigateur). Seuls la page 404 et les réglages du `.htaccess`
(HTTPS, cache) ne s’activent qu’une fois le site en ligne chez OVH.

Le contenu du dossier `galluplocard-site` est exactement ce qu’il faut transférer
dans le dossier `www` d’OVH.

## Mise en ligne chez OVH

1. Connectez-vous en FTP/SFTP à l’hébergement (FileZilla, Cyberduck…) avec les
   identifiants FTP de l’espace client OVH.
2. Ouvrez le dossier **`www`** (racine du site).
3. Transférez-y **tout le contenu** du projet : tous les fichiers `.html`, `robots.txt`,
   `sitemap.xml`, `.htaccess`, et les dossiers `projets`, `css`, `js`, `assets`.
   - `.htaccess` est un fichier caché : activez l’affichage des fichiers cachés dans
     votre logiciel FTP.
   - `README.md` n’a pas besoin d’être envoyé.
4. Dans l’espace client OVH, vérifiez que le **certificat SSL** (Let’s Encrypt, gratuit)
   est actif pour `galluplocard.fr` : le `.htaccess` redirige automatiquement vers
   `https://galluplocard.fr`.

## Mettre à jour le site en ligne

Transférez à nouveau les fichiers modifiés dans le dossier `www` (en écrasant les
anciens). Le plus simple : renvoyer tout le contenu du dossier `galluplocard-site`.

Grâce au fichier `.htaccess`, les navigateurs vérifient à chaque visite si les pages,
le CSS et le JavaScript ont changé : une mise à jour est visible immédiatement.
Les images sont gardées en mémoire 1 jour : après avoir remplacé une photo, testez
en navigation privée pour la voir tout de suite.

Si un jour une modification du CSS ou du JavaScript ne s’affiche pas, augmentez le
numéro de version dans toutes les pages HTML : `style.css?v=2` → `style.css?v=3`
(et de même pour `main.js?v=2`).

## Remplacer ou ajouter une image

Chaque image existe en deux formats : **WebP** (léger, utilisé en priorité) et
**JPG** (secours, et version ouverte dans la visionneuse).

Pour **remplacer** une image en gardant son nom (le plus simple) :

1. Préparez votre image (largeur conseillée : 1280 à 1600 px).
2. Exportez-la en JPG et en WebP (par exemple avec https://squoosh.app, qui
   fonctionne dans le navigateur, qualité 80 environ).
3. Écrasez les fichiers existants dans `assets/images/...` **avec les mêmes noms**.
   Exemple pour la mallette ISIS : `isis-mallette.jpg` et `isis-mallette-594.webp`.
4. Si les proportions changent, mettez à jour `width="…"` et `height="…"` de la balise
   `<img>` correspondante dans la page concernée (dimensions réelles du JPG). Cela évite
   les sauts de mise en page.

Pour **ajouter** une image à une galerie : copiez un bloc `<li class="shot">…</li>`
existant dans la page du projet (`projets/…html`), changez les chemins, les dimensions, le texte alternatif
(`alt`) et la légende. La visionneuse et la mise en page s’adaptent toutes seules.

> Note : un seul fichier WebP par image suffit. Les variantes `-640` servent juste à
> alléger l’affichage sur mobile ; vous pouvez les omettre en gardant une seule
> adresse dans `srcset`.

## Ajouter un troisième projet (ou plus)

Un projet = **une page** dans le dossier `projets/` + **une carte** dans `projets.html`.

1. **Images** : créez un dossier `assets/images/nom-du-projet/` et placez-y vos visuels.
2. **La page du projet** : dupliquez `projets/isis.html` (ou `voyage-en-gaule.html`)
   et renommez la copie, par exemple `projets/nom-du-projet.html`. Dans ce fichier,
   modifiez :
   - le `<title>`, la `description` et les deux adresses `galluplocard.fr/projets/…`
     (balises `canonical` et `og:url`) en haut du fichier ;
   - le numéro (`03`), la catégorie, le titre, le sous-titre et le texte ;
   - les images, textes alternatifs et légendes (les chemins commencent par
     `../assets/…` car la page est dans le dossier `projets/`) ;
   - la mise en page, sur la balise `<article>` :
     - `project--split` : texte à gauche, visuel à droite, galerie dessous ;
     - `project--split project--reverse` : visuel à gauche, texte à droite ;
     - `project--wide` : grand visuel en haut, puis texte et galerie côte à côte ;
   - la galerie : `shots` (colonnes souples) ou `shots shots--rows` (rangées
     d’images de même hauteur, idéal pour des captures d’écran) ;
   - en bas de page, les liens « Projet précédent / Projet suivant ».
     Pensez aussi à ajouter le lien « Projet suivant » sur la page du projet
     précédent (aujourd’hui `voyage-en-gaule.html`).
3. **La carte** : dans `projets.html`, copiez un bloc `<li>…</li>` de la liste
   `project-cards`, collez-le à la fin et changez le lien, le thème, le numéro,
   les textes et l’image.
4. **Univers graphique** : dans `css/style.css`, section 8 « THÈMES DE PROJETS »,
   dupliquez un thème et renommez-le, par exemple :

   ```css
   .project-theme-nom {
     --p-bg: #…;      /* fond du projet */
     --p-ink: #…;     /* texte */
     --p-muted: #…;   /* texte secondaire */
     --p-accent: #…;  /* couleur d’accent */
     --p-line: rgba(…); /* filets */
   }
   ```

   puis mettez `project-theme-nom` sur l’`<article>` de la page **et** sur la carte.
   Sans thème, le projet prend automatiquement l’identité sobre de Gallup & Locard.
5. **Bouton « Voir le projet en ligne »** : un modèle commenté se trouve dans
   `projets/isis.html` (`project__actions`).
6. Ajoutez l’adresse de la nouvelle page dans `sitemap.xml`.
7. Quand le moment sera venu, supprimez dans `projets.html` le bloc
   « D’autres expériences sont en développement. ».

## Images utilisées

| Fichier | Source | Traitement |
| --- | --- | --- |
| `isis/isis-mallette` | photo de la mallette, **extraite de la planche ISIS** (original non fourni) | recadrage pour exclure le texte manuscrit et le tampon de la planche — **à remplacer par la photo originale** |
| `isis/isis-interface` | capture iPad, interface principale | recadrage : barre Safari et heure retirées |
| `isis/isis-missions` | capture iPad, liste des missions | recadrage sur la fenêtre |
| `isis/isis-acces` | capture iPad, accès protégé | recadrage sur la fenêtre |
| `isis/isis-cartes` | capture iPad, carte Canaries & Cádiz | recadrage sur la fenêtre |
| `isis/isis-agenda` | capture iPad, tableau des opérations | recadrage sur la fenêtre |
| `gaule/gaule-promenade` | page « Promenade historique » | aucun (image entière) |
| `gaule/gaule-itineraire` | page guide / calendrier | quelques pixels retirés en bas (ligne de texte coupée) |
| `gaule/gaule-autun` | page « Avtvn » | aucun (image entière) |
| `gaule/gaule-quiz` | écran de quiz « Question #4 » | aucun (image entière) |

Aucun contenu d’image n’a été modifié (ni redessiné, ni retouché).
Les planches de présentation n’ont servi que de référence.

Volontairement **non publiées** : la capture Datapass (billets de train réels avec
données personnelles et QR codes) et la carte illustrée de La Gomera (illustration
d’origine tierce probable).
