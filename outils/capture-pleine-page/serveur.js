#!/usr/bin/env node
// Petite interface web locale pour capture.js : http://localhost:3000
// (accessible uniquement depuis cet ordinateur ; CHROMIUM=chemin pour un Chromium déjà installé)

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { capturer } = require('./capture.js');

const PORT = Number(process.env.PORT) || 3000;

const PAGE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Capture pleine page</title>
<style>
  :root { color-scheme: light dark; --fond: #f6f5f2; --carte: #fff; --texte: #1c1b19; --doux: #6b6862;
          --bord: #dedbd4; --accent: #2b5fd9; }
  @media (prefers-color-scheme: dark) {
    :root { --fond: #171716; --carte: #222220; --texte: #eceae6; --doux: #a19e97; --bord: #3a3936; --accent: #7aa2ff; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fond); color: var(--texte); font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 1.6rem; margin: 0 0 4px; }
  p.intro { color: var(--doux); margin: 0 0 24px; }
  form { background: var(--carte); border: 1px solid var(--bord); border-radius: 12px; padding: 20px; display: grid; gap: 16px; }
  label { display: grid; gap: 4px; font-weight: 600; font-size: .9rem; }
  label small { font-weight: 400; color: var(--doux); }
  input, select { font: inherit; padding: 9px 11px; border: 1px solid var(--bord); border-radius: 8px;
                  background: var(--fond); color: var(--texte); width: 100%; }
  .ligne { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
  details summary { cursor: pointer; color: var(--doux); }
  details[open] summary { margin-bottom: 12px; }
  details .ligne + label, details label + label { margin-top: 12px; }
  button { font: inherit; font-weight: 600; padding: 11px 18px; border: 0; border-radius: 8px;
           background: var(--accent); color: #fff; cursor: pointer; justify-self: start; }
  button:disabled { opacity: .6; cursor: wait; }
  #etat { margin: 20px 0 0; white-space: pre-wrap; font: 13px/1.5 ui-monospace, monospace; color: var(--doux); }
  #resultat { margin-top: 20px; }
  #resultat a.telecharger { display: inline-block; margin-bottom: 12px; font-weight: 600; color: var(--accent); }
  #resultat img { width: 100%; border: 1px solid var(--bord); border-radius: 8px; display: block; }
</style>
</head>
<body>
<main>
  <h1>Capture pleine page</h1>
  <p class="intro">La page est défilée jusqu’en bas — autant de fois que nécessaire — pour que tout son contenu soit chargé avant la capture.</p>
  <form id="f">
    <label>Adresse de la page
      <input name="url" type="text" required placeholder="https://exemple.fr" autofocus>
    </label>
    <div class="ligne">
      <label>Format
        <select name="format"><option value="png">PNG</option><option value="jpg">JPEG (plus léger)</option><option value="pdf">PDF</option></select>
      </label>
      <label>Affichage
        <select name="affichage"><option value="bureau">Ordinateur</option><option value="mobile">Mobile (iPhone)</option></select>
      </label>
      <label>Largeur (px)
        <input name="largeur" type="number" min="320" max="3840" value="1440">
      </label>
      <label>Densité
        <select name="echelle"><option value="1">Normale (×1)</option><option value="2">Retina (×2)</option></select>
      </label>
    </div>
    <details>
      <summary>Réglages avancés</summary>
      <div class="ligne">
        <label>Pause entre défilements <small>ms — à augmenter si le site est lent</small>
          <input name="pause" type="number" min="100" max="10000" value="800">
        </label>
        <label>Durée max. du défilement <small>secondes</small>
          <input name="dureeMax" type="number" min="5" max="600" value="120">
        </label>
        <label>Hauteur max. <small>px — limite pour les défilements infinis</small>
          <input name="hauteurMax" type="number" min="1000" max="200000" value="60000">
        </label>
      </div>
      <label>Cliquer avant de défiler <small>sélecteur CSS ou texte, ex. <code>text=Tout accepter</code> (bandeau cookies)</small>
        <input name="cliquer" type="text">
      </label>
      <label>Masquer <small>sélecteurs CSS séparés par des virgules, ex. <code>#cookie-banner, .chat-widget</code></small>
        <input name="masquer" type="text">
      </label>
    </details>
    <button id="go">Capturer la page</button>
  </form>
  <div id="etat" aria-live="polite"></div>
  <div id="resultat"></div>
</main>
<script>
const f = document.getElementById('f'), etat = document.getElementById('etat'),
      resultat = document.getElementById('resultat'), go = document.getElementById('go');
let ancienLien = null;
f.addEventListener('submit', async (e) => {
  e.preventDefault();
  go.disabled = true; go.textContent = 'Capture en cours…';
  etat.textContent = ''; resultat.innerHTML = '';
  if (ancienLien) URL.revokeObjectURL(ancienLien);
  const donnees = Object.fromEntries(new FormData(f));
  try {
    const rep = await fetch('/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify(donnees) });
    const lecteur = rep.body.getReader(); const dec = new TextDecoder(); let tampon = '';
    for (;;) {
      const { done, value } = await lecteur.read(); if (done) break;
      tampon += dec.decode(value, { stream: true });
      let i;
      while ((i = tampon.indexOf('\\n')) >= 0) {
        const msg = JSON.parse(tampon.slice(0, i)); tampon = tampon.slice(i + 1);
        if (msg.journal) etat.textContent += '• ' + msg.journal + '\\n';
        if (msg.erreur) etat.textContent += '✗ ' + msg.erreur + '\\n';
        if (msg.fichier) afficher(msg);
      }
    }
  } catch (err) {
    etat.textContent += '✗ ' + err.message + '\\n';
  } finally {
    go.disabled = false; go.textContent = 'Capturer la page';
  }
});
async function afficher(msg) {
  const fichier = await (await fetch('/fichier/' + encodeURIComponent(msg.fichier))).blob();
  ancienLien = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.className = 'telecharger'; a.href = ancienLien; a.download = msg.nom;
  a.textContent = 'Télécharger ' + msg.nom + ' (' + msg.largeur + ' × ' + msg.hauteur + ' px)';
  resultat.appendChild(a);
  if (!msg.nom.endsWith('.pdf')) {
    const img = new Image(); img.src = ancienLien; img.alt = 'Aperçu de la capture'; resultat.appendChild(img);
  }
}
</script>
</body>
</html>`;

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-'));
let navigateur = null;
let file = Promise.resolve(); // une capture à la fois

function nomFichier(url, format) {
  let base = 'capture';
  try {
    const u = new URL(/^[a-z]+:/i.test(url) ? url : 'https://' + url);
    base = 'capture-' + (u.hostname + u.pathname).replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  } catch { /* nom par défaut */ }
  return `${base.slice(0, 80)}-${Date.now()}.${format}`;
}

const liste = (v) => String(v || '').split(/\s*,\s*/).filter(Boolean);
const entier = (v, min, max, defaut) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

async function traiterCapture(req, res) {
  let corps = '';
  for await (const morceau of req) corps += morceau;
  let d;
  try { d = JSON.parse(corps); } catch { res.writeHead(400).end(); return; }

  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
  const envoyer = (o) => res.write(JSON.stringify(o) + '\n');

  const format = ['png', 'jpg', 'pdf'].includes(d.format) ? d.format : 'png';
  const nom = nomFichier(d.url, format);
  const tache = file.then(async () => {
    try {
      navigateur = navigateur && navigateur.isConnected()
        ? navigateur
        : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
      const r = await capturer(String(d.url || '').trim(), path.join(dossier, nom), {
        navigateur,
        mobile: d.affichage === 'mobile',
        largeur: entier(d.largeur, 320, 3840, 1440),
        echelle: entier(d.echelle, 1, 3, 1),
        pause: entier(d.pause, 100, 10000, 800),
        dureeMax: entier(d.dureeMax, 5, 600, 120) * 1000,
        hauteurMax: entier(d.hauteurMax, 1000, 200000, 60000),
        cliquer: d.cliquer ? [String(d.cliquer)] : [],
        masquer: liste(d.masquer),
        journal: (m) => envoyer({ journal: m }),
      });
      envoyer({ fichier: nom, nom, largeur: r.largeur, hauteur: r.hauteur });
    } catch (e) {
      envoyer({ erreur: e.message.split('\n')[0] });
    }
    res.end();
  });
  file = tache.catch(() => {});
  await tache;
}

const serveur = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE);
    } else if (req.method === 'POST' && req.url === '/capture') {
      await traiterCapture(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/fichier/')) {
      const nom = path.basename(decodeURIComponent(req.url.slice('/fichier/'.length)));
      const chemin = path.join(dossier, nom);
      if (!fs.existsSync(chemin)) { res.writeHead(404).end(); return; }
      const types = { png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf' };
      res.writeHead(200, { 'Content-Type': types[path.extname(nom).slice(1)] || 'application/octet-stream' });
      fs.createReadStream(chemin).pipe(res);
    } else {
      res.writeHead(404).end();
    }
  } catch (e) {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`Interface prête : http://localhost:${PORT}  (Ctrl+C pour arrêter)`);
});

const arreter = async () => {
  if (navigateur) await navigateur.close().catch(() => {});
  fs.rmSync(dossier, { recursive: true, force: true });
  process.exit(0);
};
process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);
