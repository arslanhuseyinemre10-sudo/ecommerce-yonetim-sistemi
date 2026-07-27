import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'));
const project = path.resolve(here, '..');
const template = await readFile(path.join(here, 'worker-template.js'), 'utf8');

let html = await readFile(path.join(project, 'index.html'), 'utf8');
html = html.replace('</head>', `
  <meta name="description" content="E-Ticaret Yönetim Sistemi ürün, sipariş ve stok yönetim paneli">
  <meta property="og:title" content="E-Ticaret Yönetim Sistemi">
  <meta property="og:description" content="Ürünlerini, stoklarını ve siparişlerini tek panelden yönet.">
  <meta property="og:image" content="__SITE_ORIGIN__/og.png">
  <meta name="twitter:card" content="summary_large_image">
</head>`);

const assets = {
  '__INDEX_HTML__': JSON.stringify(html),
  '__STYLE_CSS__': JSON.stringify(await readFile(path.join(project, 'css', 'style.css'), 'utf8')),
  '__STORAGE_JS__': JSON.stringify(await readFile(path.join(project, 'js', 'storage.js'), 'utf8')),
  '__APP_JS__': JSON.stringify(await readFile(path.join(project, 'js', 'app.js'), 'utf8')),
  '__OG_BASE64__': JSON.stringify(existsSync(path.join(here, 'public', 'og.png'))
    ? (await readFile(path.join(here, 'public', 'og.png'))).toString('base64')
    : '')
};

let output = template;
for (const [token, value] of Object.entries(assets)) output = output.replace(token, value);

const outDir = path.join(here, 'dist', 'server');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.js'), output, 'utf8');
console.log('E-Ticaret Yönetim Sistemi çevrim içi sürümü oluşturuldu.');
