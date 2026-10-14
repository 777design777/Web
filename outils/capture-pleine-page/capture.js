#!/usr/bin/env node
// Capture d'écran pleine page des sites « dynamiques » :
// la page est d'abord défilée jusqu'en bas, autant de fois que nécessaire,
// pour que tout le contenu chargé au défilement (défilement infini, images
// paresseuses, animations à l'apparition…) soit présent avant la capture.

'use strict';

const path = require('path');
const { chromium } = require('playwright');

const PAR_DEFAUT = {
  largeur: 1440,           // largeur de la fenêtre (px)
  hauteurFenetre: 900,     // hauteur de la fenêtre (px)
  echelle: 1,              // 2 = capture « Retina »
  mobile: false,           // simule un iPhone (390 px, tactile)
  pause: 800,              // attente après chaque pas de défilement (ms)
  toursStables: 3,         // nb de fois où le bas doit être atteint sans que la page grandisse
  dureeMax: 120000,        // durée maximale du chargement par défilement (ms)
  hauteurMax: 60000,       // au-delà, la capture est coupée (défilement infini sans fin)
  attenteFinale: 1000,     // attente avant la capture (ms)
  masquer: [],             // sélecteurs CSS à masquer (bandeaux cookies, chat…)
  cliquer: [],             // sélecteurs CSS à cliquer avant de défiler (« Accepter »…)
  pleineQualite: 90,       // qualité JPEG
  connexion: false,        // fenêtre visible pour se connecter avant la capture
  profil: path.join(__dirname, 'profil-navigateur'), // connexions conservées (mode connexion)
  attendreConnexion: async () => {},
  delaiNavigation: 60000,
  journal: () => {},
};

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Suit les requêtes réseau en cours pour savoir quand la page a fini de charger.
function suivreReseau(page) {
  const enCours = new Set();
  let derniereActivite = Date.now();
  const debut = (r) => { enCours.add(r); derniereActivite = Date.now(); };
  const fin = (r) => { enCours.delete(r); derniereActivite = Date.now(); };
  page.on('request', debut);
  page.on('requestfinished', fin);
  page.on('requestfailed', fin);
  return {
    // Attend qu'aucune requête ne soit en cours depuis `calme` ms (au plus `max` ms).
    // Les connexions qui ne se terminent jamais (flux, sondage) sont ignorées après `max`.
    async calme(calme = 500, max = 8000) {
      const limite = Date.now() + max;
      while (Date.now() < limite) {
        if (enCours.size === 0 && Date.now() - derniereActivite >= calme) return true;
        await attendre(100);
      }
      return false;
    },
  };
}

// Code exécuté dans la page : trouve l'élément qui défile vraiment.
// La plupart des sites défilent sur le document, mais certains (applications,
// sites « plein écran ») défilent dans un bloc interne : on prend alors le plus grand.
function marquerDefileur() {
  const doc = document.scrollingElement || document.documentElement;
  if (doc.scrollHeight > window.innerHeight + 5) return 'document';
  let meilleur = null;
  let surface = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollHeight <= el.clientHeight + 5) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
    const r = el.getBoundingClientRect();
    const s = r.width * r.height;
    if (s > surface) { surface = s; meilleur = el; }
  }
  if (!meilleur) return 'document';
  meilleur.setAttribute('data-capture-defileur', '');
  return 'element';
}

function etatDefilement() {
  const el = document.querySelector('[data-capture-defileur]');
  if (el) {
    return { position: el.scrollTop, vue: el.clientHeight, hauteur: el.scrollHeight };
  }
  const doc = document.scrollingElement || document.documentElement;
  return {
    position: window.scrollY,
    vue: window.innerHeight,
    hauteur: Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0),
  };
}

function defilerVers(y) {
  const el = document.querySelector('[data-capture-defileur]');
  if (el) el.scrollTo(0, y);
  else window.scrollTo(0, y);
}

// Pour un site qui défile dans un bloc interne, la capture « pleine page »
// ne voit qu'un écran : on déplie ce bloc (et ses parents) à sa hauteur réelle.
function deplierDefileur() {
  const el = document.querySelector('[data-capture-defileur]');
  if (!el) return;
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; }
    [data-capture-deplie] { height: auto !important; min-height: 0 !important; max-height: none !important;
                            overflow: visible !important; }
    [data-capture-fixe] { position: relative !important; inset: auto !important; }`;
  document.head.appendChild(style);
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    n.setAttribute('data-capture-deplie', '');
    const pos = getComputedStyle(n).position;
    if (pos === 'fixed' || pos === 'absolute') n.setAttribute('data-capture-fixe', '');
  }
  // La hauteur se mesure désormais sur le document
  el.removeAttribute('data-capture-defileur');
}

// Force le chargement des images et iframes « paresseuses » restantes.
function forcerChargementParesseux() {
  for (const el of document.querySelectorAll('img[loading="lazy"], iframe[loading="lazy"]')) {
    el.loading = 'eager';
  }
  // Conventions courantes des bibliothèques de chargement paresseux
  for (const img of document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]')) {
    const src = img.dataset.src || img.dataset.lazySrc || img.dataset.original;
    if (src && img.getAttribute('src') !== src) img.src = src;
  }
  for (const el of document.querySelectorAll('[data-srcset]')) {
    if (!el.srcset) el.srcset = el.dataset.srcset;
  }
}

function imagesChargees() {
  return Promise.all(
    [...document.images].map((img) =>
      img.complete
        ? null
        : new Promise((r) => { img.addEventListener('load', r, { once: true });
                               img.addEventListener('error', r, { once: true }); })
    )
  ).then(() => true);
}

async function chargerEnEntier(page, reseau, o) {
  const debut = Date.now();
  const tempsRestant = () => o.dureeMax - (Date.now() - debut);

  // Certains sites n'affichent leur contenu qu'un instant après le chargement :
  // on attend qu'une zone défilable apparaisse (au plus quelques secondes).
  let type = await page.evaluate(marquerDefileur);
  for (let i = 0; i < 10 && type === 'document'; i++) {
    const e = await page.evaluate(etatDefilement);
    if (e.hauteur > e.vue + 5) break;
    await attendre(500);
    await reseau.calme(300, 3000);
    type = await page.evaluate(marquerDefileur);
  }
  o.journal(`Défilement : ${type === 'document' ? 'page' : 'bloc interne'}`);

  // La molette est placée au centre : certains sites écoutent la molette, pas le défilement.
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);

  let toursStables = 0;
  let pas = 0;
  while (tempsRestant() > 0) {
    const avant = await page.evaluate(etatDefilement);
    const enBas = avant.position + avant.vue >= avant.hauteur - 2;

    if (!enBas) {
      const cible = Math.min(avant.position + Math.round(avant.vue * 0.85), avant.hauteur);
      await page.mouse.wheel(0, cible - avant.position).catch(() => {});
      await page.evaluate(defilerVers, cible);
      if (++pas % 10 === 0) o.journal(`… ${cible + avant.vue} / ${avant.hauteur} px`);
      await attendre(o.pause);
      await reseau.calme(400, 5000);
      continue;
    }

    if (avant.hauteur >= o.hauteurMax) {
      o.journal(`Hauteur maximale atteinte (${o.hauteurMax} px) : arrêt du défilement`);
      break;
    }

    // En bas : petit aller-retour (certains sites ne chargent la suite qu'en voyant
    // une « sentinelle » entrer à nouveau dans l'écran), puis on regarde si la page a grandi.
    await page.evaluate(defilerVers, Math.max(0, avant.position - avant.vue));
    await attendre(200);
    await page.evaluate(defilerVers, avant.hauteur);
    await page.mouse.wheel(0, avant.vue).catch(() => {});
    await attendre(o.pause);
    await reseau.calme(600, 8000);

    const apres = await page.evaluate(etatDefilement);
    if (apres.hauteur > avant.hauteur + 2) {
      toursStables = 0;
      o.journal(`Nouveau contenu chargé (${apres.hauteur} px)`);
    } else {
      toursStables++;
      o.journal(`Bas de page (${apres.hauteur} px), vérification ${toursStables}/${o.toursStables}`);
      if (toursStables >= o.toursStables) break;
    }
  }
  if (tempsRestant() <= 0) {
    o.journal(`Durée maximale atteinte (${o.dureeMax / 1000} s) : capture de ce qui est chargé`);
  }
  return type;
}

async function capturer(url, sortie, options = {}) {
  const o = { ...PAR_DEFAUT, ...options };
  if (!/^https?:\/\//i.test(url) && !/^file:/i.test(url)) url = 'https://' + url;
  const format = path.extname(sortie).slice(1).toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'pdf'].includes(format)) {
    throw new Error(`Format non pris en charge : .${format} (utiliser .png, .jpg ou .pdf)`);
  }

  const chemin = o.cheminChromium || process.env.CHROMIUM;
  const reglagesContexte = {
    viewport: o.mobile ? { width: 390, height: 844 } : { width: o.largeur, height: o.hauteurFenetre },
    deviceScaleFactor: o.mobile ? Math.max(o.echelle, 2) : o.echelle,
    isMobile: o.mobile,
    hasTouch: o.mobile,
    userAgent: o.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : undefined,
    locale: 'fr-FR',
  };

  // Mode connexion : fenêtre visible et profil conservé sur le disque, pour pouvoir
  // se connecter à un compte (espace client, commande…) et le rester d'une fois sur l'autre.
  let navigateur = null;
  let contexte;
  if (o.connexion) {
    if (format === 'pdf') throw new Error('Le PDF n\'est pas possible en mode connexion : utiliser .png ou .jpg');
    contexte = await chromium.launchPersistentContext(o.profil, {
      ...reglagesContexte,
      headless: false,
      executablePath: chemin || undefined,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });
  } else {
    navigateur = o.navigateur || (await chromium.launch(chemin ? { executablePath: chemin } : {}));
    contexte = await navigateur.newContext(reglagesContexte);
  }
  let page = contexte.pages()[0] || (await contexte.newPage());
  let reseau = suivreReseau(page);

  try {
    o.journal(`Ouverture de ${url}`);
    await page.goto(url, { waitUntil: 'load', timeout: o.delaiNavigation });
    await reseau.calme(500, 10000);

    if (o.connexion) {
      o.journal('En attente de la connexion dans la fenêtre du navigateur…');
      await o.attendreConnexion();
      // La connexion a pu ouvrir un nouvel onglet : on capture le dernier ouvert.
      const ouvertes = contexte.pages().filter((p) => !p.isClosed());
      if (!ouvertes.length) throw new Error('La fenêtre du navigateur a été fermée');
      if (ouvertes[ouvertes.length - 1] !== page) {
        page = ouvertes[ouvertes.length - 1];
        reseau = suivreReseau(page);
      }
      await page.bringToFront();
      await reseau.calme(500, 10000);
      o.journal(`Capture de ${page.url()} — ne touchez plus à la fenêtre jusqu'à la fin`);
    }

    for (const sel of o.cliquer) {
      try {
        await page.locator(sel).first().click({ timeout: 3000 });
        o.journal(`Clic sur ${sel}`);
        await attendre(500);
      } catch {
        o.journal(`Introuvable (ignoré) : ${sel}`);
      }
    }

    const type = await chargerEnEntier(page, reseau, o);

    o.journal('Chargement des images restantes');
    await page.evaluate(forcerChargementParesseux);
    await reseau.calme(500, 10000);
    await Promise.race([page.evaluate(imagesChargees), attendre(15000)]);

    // Retour en haut : les en-têtes fixes et les animations retrouvent leur état initial.
    await page.evaluate(defilerVers, 0);
    if (type === 'element') await page.evaluate(deplierDefileur);
    // Fenêtre visible : la barre de défilement réduirait la largeur de la capture.
    if (o.connexion) await page.addStyleTag({ content: 'html { scrollbar-width: none !important; }' });
    if (o.masquer.length) {
      await page.addStyleTag({
        content: `${o.masquer.join(', ')} { visibility: hidden !important; display: none !important; }`,
      });
    }
    await attendre(o.attenteFinale);

    const { hauteur } = await page.evaluate(etatDefilement);
    const hauteurCapture = Math.min(hauteur, o.hauteurMax);
    o.journal(`Capture (${page.viewportSize().width} × ${hauteurCapture} px) → ${sortie}`);

    if (format === 'pdf') {
      await page.emulateMedia({ media: 'screen' });
      await page.pdf({
        path: sortie,
        width: `${page.viewportSize().width}px`,
        height: `${hauteurCapture + 1}px`,
        printBackground: true,
        pageRanges: '1',
      });
    } else {
      const reglages = {
        path: sortie,
        type: format === 'png' ? 'png' : 'jpeg',
        animations: 'disabled',
        caret: 'hide',
        timeout: 120000,
      };
      if (format !== 'png') reglages.quality = o.pleineQualite;
      reglages.fullPage = true;
      if (hauteur > o.hauteurMax) {
        reglages.clip = { x: 0, y: 0, width: page.viewportSize().width, height: hauteurCapture };
      }
      await page.screenshot(reglages);
    }
    return { sortie, largeur: page.viewportSize().width, hauteur: hauteurCapture };
  } finally {
    await contexte.close();
    if (navigateur && !o.navigateur) await navigateur.close();
  }
}

module.exports = { capturer, PAR_DEFAUT };

// ---------------------------------------------------------------- ligne de commande

const AIDE = `
Capture d'écran pleine page, après chargement complet par défilement.

Utilisation :
  node capture.js <adresse> [fichier] [options]

  fichier         .png (défaut), .jpg ou .pdf — par défaut : capture-<site>.png

Options :
  --largeur N         largeur de la fenêtre en px (défaut ${PAR_DEFAUT.largeur})
  --mobile            affichage iPhone (390 px)
  --echelle N         densité de pixels, 2 = Retina (défaut ${PAR_DEFAUT.echelle})
  --pause N           attente après chaque pas de défilement, en ms (défaut ${PAR_DEFAUT.pause})
  --tours N           fois où le bas doit être atteint sans nouveau contenu (défaut ${PAR_DEFAUT.toursStables})
  --duree-max N       durée maximale du défilement, en secondes (défaut ${PAR_DEFAUT.dureeMax / 1000})
  --hauteur-max N     hauteur maximale de la capture en px (défaut ${PAR_DEFAUT.hauteurMax})
  --attente N         attente avant la capture, en ms (défaut ${PAR_DEFAUT.attenteFinale})
  --cliquer "sel"     clique sur un élément avant de défiler (ex. bouton « Accepter » des cookies)
  --masquer "sel"     masque des éléments (ex. "#cookie-banner, .chat-widget")
  --connexion         page qui demande d'être connecté (espace client, commande…) :
                      ouvre une fenêtre pour se connecter, puis capture après « Entrée »
  --chromium chemin   utiliser un Chromium déjà installé
  --silencieux        n'affiche pas la progression

Exemples :
  node capture.js https://exemple.fr
  node capture.js exemple.fr page.jpg --largeur 1920 --echelle 2
  node capture.js exemple.fr --mobile --cliquer "text=Tout accepter"
  node capture.js "https://shopify.com/…/account/orders/…" commande.png --connexion
`;

function lireArguments(args) {
  const opts = { masquer: [], cliquer: [] };
  const libres = [];
  const nombre = (v, nom) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`Valeur invalide pour ${nom} : ${v}`);
    return n;
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const suivant = () => {
      if (i + 1 >= args.length) throw new Error(`Valeur manquante après ${a}`);
      return args[++i];
    };
    switch (a) {
      case '-h': case '--help': case '--aide': opts.aide = true; break;
      case '--largeur': opts.largeur = nombre(suivant(), a); break;
      case '--mobile': opts.mobile = true; break;
      case '--echelle': opts.echelle = nombre(suivant(), a); break;
      case '--pause': opts.pause = nombre(suivant(), a); break;
      case '--tours': opts.toursStables = nombre(suivant(), a); break;
      case '--duree-max': opts.dureeMax = nombre(suivant(), a) * 1000; break;
      case '--hauteur-max': opts.hauteurMax = nombre(suivant(), a); break;
      case '--attente': opts.attenteFinale = nombre(suivant(), a); break;
      case '--cliquer': opts.cliquer.push(suivant()); break;
      case '--masquer': opts.masquer.push(suivant()); break;
      case '--connexion': opts.connexion = true; break;
      case '--chromium': opts.cheminChromium = suivant(); break;
      case '--silencieux': opts.silencieux = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`Option inconnue : ${a}`);
        libres.push(a);
    }
  }
  return { opts, libres };
}

function nomParDefaut(url) {
  try {
    const u = new URL(/^[a-z]+:/i.test(url) ? url : 'https://' + url);
    const nom = (u.hostname + u.pathname).replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    return `capture-${nom || 'page'}.png`;
  } catch {
    return 'capture.png';
  }
}

if (require.main === module) {
  (async () => {
    let lu;
    try {
      lu = lireArguments(process.argv.slice(2));
    } catch (e) {
      console.error(e.message + '\n' + AIDE);
      process.exit(1);
    }
    const { opts, libres } = lu;
    if (opts.aide || libres.length === 0) {
      console.log(AIDE);
      process.exit(opts.aide ? 0 : 1);
    }
    const [url, sortie = nomParDefaut(libres[0])] = libres;
    if (!opts.silencieux) opts.journal = (m) => console.log('•', m);
    if (opts.connexion) {
      opts.attendreConnexion = () => new Promise((resolve) => {
        const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
        rl.question(
          '\n→ Dans la fenêtre qui vient de s\'ouvrir, connectez-vous et affichez la page à capturer.\n' +
          '  Appuyez ensuite sur Entrée ici pour lancer la capture… ',
          () => { rl.close(); resolve(); }
        );
      });
    }
    try {
      const r = await capturer(url, sortie, opts);
      console.log(`✓ ${path.resolve(r.sortie)} (${r.largeur} × ${r.hauteur} px)`);
    } catch (e) {
      console.error('✗ Échec :', e.message);
      if (/Executable doesn't exist/.test(e.message)) {
        console.error('  → installer le navigateur : npx playwright install chromium');
      }
      process.exit(1);
    }
  })();
}
