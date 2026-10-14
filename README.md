# Gallup & Locard — site vitrine

Site statique (HTML / CSS / JavaScript vanilla) destiné à https://galluplocard.fr.
Aucun framework, aucune dépendance externe, aucun cookie, aucun traceur.
Poids total : environ 2 Mo.

## Structure

```
/
├── index.html             page d’accueil (one-page)
├── mentions-legales.html  mentions légales (champs [À COMPLÉTER] à remplir)
├── 404.html               page d’erreur
├── robots.txt
├── sitemap.xml
├── .htaccess              HTTPS, cache, compression, sécurité (Apache / OVH)
├── css/
│   ├── style.css          tous les styles (sections numérotées et commentées)
│   └── nojs.css           complément si JavaScript est désactivé
├── js/
│   └── main.js            menu mobile, sommaire, visionneuse d’images, animations
└── assets/
    ├── fonts/             Fraunces + Instrument Sans (auto-hébergées, licence OFL)
    └── images/
        ├── isis/
        ├── gaule/
        ├── future-projects/   (vide, prêt pour la suite)
        ├── favicon.svg, apple-touch-icon.png
        └── og-galluplocard.jpg (aperçu pour les réseaux sociaux)
```

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
3. Transférez-y **tout le contenu** du projet : `index.html`, `mentions-legales.html`,
   `404.html`, `robots.txt`, `sitemap.xml`, `.htaccess`, et les dossiers `css`, `js`,
   `assets`.
   - `.htaccess` est un fichier caché : activez l’affichage des fichiers cachés dans
     votre logiciel FTP.
   - `README.md` n’a pas besoin d’être envoyé.
4. Dans l’espace client OVH, vérifiez que le **certificat SSL** (Let’s Encrypt, gratuit)
   est actif pour `galluplocard.fr` : le `.htaccess` redirige automatiquement vers
   `https://galluplocard.fr`.
5. Remplissez les champs `[À COMPLÉTER]` de `mentions-legales.html` avant publication.

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
   `<img>` correspondante dans `index.html` (dimensions réelles du JPG). Cela évite
   les sauts de mise en page.

Pour **ajouter** une image à une galerie : copiez un bloc `<li class="shot">…</li>`
existant dans `index.html`, changez les chemins, les dimensions, le texte alternatif
(`alt`) et la légende. La visionneuse et la mise en page s’adaptent toutes seules.

> Note : un seul fichier WebP par image suffit. Les variantes `-640` servent juste à
> alléger l’affichage sur mobile ; vous pouvez les omettre en gardant une seule
> adresse dans `srcset`.

## Ajouter un troisième projet (ou plus)

1. **Images** : créez un dossier `assets/images/nom-du-projet/` et placez-y vos visuels.
2. **HTML** : dans `index.html`, copiez un bloc `<article class="project …">…</article>`
   complet (ISIS ou Voyage en Gaule) et collez-le à l’endroit marqué
   « AJOUTER UN PROJET ». Modifiez :
   - `id="projet-nom"`
   - `data-index-title` et `data-index-tag` : le projet apparaîtra automatiquement
     dans le sommaire de l’accueil ;
   - le numéro (`03`), la catégorie, le titre, le sous-titre, le texte ;
   - les images, textes alternatifs et légendes ;
   - la mise en page, au choix :
     - `project--split` : texte à gauche, visuel à droite, galerie dessous ;
     - `project--split project--reverse` : visuel à gauche, texte à droite ;
     - `project--wide` : grand visuel en haut, puis texte et galerie côte à côte.
   - la galerie : `shots` (colonnes souples) ou `shots shots--rows` (rangées
     d’images de même hauteur, idéal pour des captures d’écran).
3. **Univers graphique** : dans `css/style.css`, section 8 « THÈMES DE PROJETS »,
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

   puis mettez `project-theme-nom` sur l’`<article>`. Sans thème, le projet prend
   automatiquement l’identité sobre de Gallup & Locard.
4. **Bouton « Voir le projet »** : un modèle commenté se trouve dans le bloc ISIS
   (`project__actions`).
5. Quand le moment sera venu, supprimez le bloc `<p class="… projects__more" …>`
   (« D’autres expériences sont en développement. ») : la mention disparaît aussi
   du sommaire de l’accueil.
6. Mettez à jour la date `<lastmod>` de `sitemap.xml`.

Pour une future **page individuelle** de projet : partir de `mentions-legales.html`
(même en-tête et pied de page), y coller le bloc `<article>` du projet, et ajouter
l’adresse dans `sitemap.xml`.

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
