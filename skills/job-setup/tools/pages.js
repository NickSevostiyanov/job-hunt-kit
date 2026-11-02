#!/usr/bin/env node
// Counts real pages in a PDF with no dependencies, inflating compressed object
// streams so page objects hidden inside them are counted too.
// Usage: node pages.js <file.pdf | folder> [...]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// The PDF's raw bytes plus every inflated stream, as latin1 text.
function pdfContent(file) {
  const buf = fs.readFileSync(file);
  const text = buf.toString('latin1');
  let extra = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end === -1) continue;
    try { extra += zlib.inflateSync(buf.subarray(start, end)).toString('latin1'); } catch { /* not flate */ }
  }
  return text + extra;
}

function countPages(file) {
  return (pdfContent(file).match(/\/Type\s*\/Page(?![sA-Za-z])/g) || []).length;
}

function pdfsIn(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap(e => {
    const p = path.join(target, e.name);
    return e.isDirectory() ? pdfsIn(p) : e.name.toLowerCase().endsWith('.pdf') ? [p] : [];
  });
}

module.exports = { countPages, pdfContent };

if (require.main === module) {
  const targets = process.argv.slice(2);
  if (!targets.length) { console.error('Usage: node pages.js <file.pdf | folder> [...]'); process.exit(2); }
  for (const f of targets.flatMap(pdfsIn).sort()) console.log(`${String(countPages(f)).padStart(3)} page(s)  ${f}`);
}
