#!/usr/bin/env node
// Renders HTML to PDF with the Chrome, Edge or Chromium already on the machine
// (no npm packages), writes it to pdf/ next to the HTML, prints the page count,
// and checks what an ATS will see: a real text layer, your contact details on
// the page, no broken characters, no unfilled {{placeholders}}. The page limit
// comes from --max-pages, else profile.json settings. Exits 1 on any problem.
// Usage: node render.js <file.html> [more.html ...] [--max-pages N]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');
const { countPages, pdfContent } = require('./pages');
const kit = require('./jobkit');

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const known = {
    win32: roots.flatMap(r => [
      path.join(r, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(r, 'Chromium', 'Application', 'chrome.exe'),
    ]),
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
  }[process.platform] || [];
  const hit = known.find(p => fs.existsSync(p));
  if (hit) return hit;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim(); } catch { /* keep looking */ }
  }
  return null;
}

const args = process.argv.slice(2);
let maxPages = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max-pages') maxPages = Number(args[++i]);
  else files.push(args[i]);
}
if (!files.length) { console.error('Usage: node render.js <file.html> [...] [--max-pages N]'); process.exit(2); }

// Page limit and contact details from profile.json, for files under the
// resumes or cover-letter folder.
function contextFor(src) {
  const root = kit.findRoot(path.dirname(src));
  const profile = root ? kit.loadProfile(root) : {};
  const s = profile.settings || {};
  const inKind = k => root && src.startsWith(kit.kindDir(root, k, profile) + path.sep);
  const limit = maxPages || (inKind('resumes') ? s.resume_max_pages || 2 : inKind('coverletters') ? s.coverletter_max_pages || 1 : null);
  const id = profile.identity || {};
  const contact = inKind('resumes') || inKind('coverletters') ? [id.email, id.phone].filter(Boolean) : [];
  return { limit, contact };
}

const browser = findBrowser();
if (!browser) { console.error('No Chrome, Edge or Chromium found. Install one, or set CHROME_PATH to its executable.'); process.exit(1); }

let failed = false;
for (const f of files) {
  const src = path.resolve(f);
  const html = fs.readFileSync(src, 'utf8');
  const outDir = path.join(path.dirname(src), 'pdf');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, path.basename(src).replace(/\.html?$/i, '') + '.pdf');
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobkit-'));
  try {
    execFileSync(browser, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${userDir}`, '--no-pdf-header-footer', '--print-to-pdf-no-header',
      `--print-to-pdf=${out}`, pathToFileURL(src).href,
    ], { stdio: 'ignore', timeout: 90000 });
  } finally {
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch { /* browser may still hold it */ }
  }
  if (!fs.existsSync(out)) { console.error(`FAILED  ${src} (no PDF produced)`); failed = true; continue; }

  const pages = countPages(out);
  const { limit, contact } = contextFor(src);
  const over = limit && pages > limit;
  const garbled = /�|â€|Ã[-¿]/.test(html);
  const placeholders = html.match(/\{\{[^}]+\}\}/g);
  // ATS parsers read the PDF's text layer: Chrome writes a ToUnicode map for
  // every real-text font, so a PDF without one is effectively an image.
  const unreadable = !/\/ToUnicode/.test(pdfContent(out));
  const visible = html.replace(/<(script|style)[\s\S]*?<\/>|<!--[\s\S]*?-->/gi, '').replace(/<[^>]+>/g, ' ');
  const missing = contact.filter(c => !visible.includes(c));
  console.log(`${over ? 'OVER  ' : 'OK    '} ${pages} page(s)${limit ? ` (max ${limit})` : ''}  ${out}`);
  if (garbled) console.log('        WARNING: broken characters in the HTML (U+FFFD or mojibake). Re-save as UTF-8.');
  if (placeholders) console.log(`        WARNING: unfilled placeholders: ${[...new Set(placeholders)].join(', ')}`);
  if (unreadable) console.log('        WARNING: the PDF has no text layer, so an ATS will read nothing. Use real text, not images.');
  if (missing.length) console.log(`        WARNING: contact details from profile.json not on the page: ${missing.join(', ')}`);
  if (over || garbled || placeholders || unreadable || missing.length) failed = true;
}
process.exit(failed ? 1 : 0);
