#!/usr/bin/env node
// Plain text from .docx, .odt, .html, .md, .txt, .rtf and .json with no
// dependencies. PDFs and images are read with Claude's own Read tool instead.
// Usage: node extract.js <file> [...]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read one entry from a zip archive (docx/odt are zips).
function unzipEntry(buf, wanted) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  let p = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in archive`);
}

const decode = s => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const tidy = s => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

function extract(file) {
  const ext = path.extname(file).toLowerCase();
  const buf = fs.readFileSync(file);
  if (ext === '.docx') {
    const xml = unzipEntry(buf, 'word/document.xml');
    return tidy(decode(xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')));
  }
  if (ext === '.odt') {
    const xml = unzipEntry(buf, 'content.xml');
    return tidy(decode(xml.replace(/<text:tab\/>/g, '\t').replace(/<text:line-break\/>/g, '\n').replace(/<\/text:(p|h)>/g, '\n').replace(/<[^>]+>/g, '')));
  }
  if (ext === '.html' || ext === '.htm') {
    const html = buf.toString('utf8').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
    return tidy(decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '')));
  }
  if (ext === '.rtf') {
    return tidy(buf.toString('latin1').replace(/\\par[d]?/g, '\n').replace(/\{\\\*[^}]*\}|\\[a-z]+-?\d* ?|[{}]/g, ''));
  }
  if (['.md', '.txt', '.json', '.csv'].includes(ext)) return buf.toString('utf8');
  if (ext === '.pdf') throw new Error('PDF: read it with the Read tool');
  if (ext === '.doc') throw new Error('old .doc format: ask the user to save it as .docx or PDF');
  throw new Error(`unsupported file type ${ext || '(none)'}`);
}

for (const f of process.argv.slice(2)) {
  try { console.log(`===== ${f}\n${extract(f)}\n`); } catch (e) { console.log(`===== ${f}\nSKIPPED: ${e.message}\n`); }
}
