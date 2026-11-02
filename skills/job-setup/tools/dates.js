#!/usr/bin/env node
// Live dates for the job folder. Run from anywhere inside it.
//   node dates.js today resumes|coverletters   create and print today's folder
//   node dates.js latest resumes|coverletters  print the newest dated folder and its documents
//   node dates.js guess <file> [...]           best date for an existing file: name, then modified time
//   node dates.js status                       one-paragraph summary of the job folder
const fs = require('fs');
const path = require('path');
const kit = require('./jobkit');

const [cmd, ...rest] = process.argv.slice(2);
const root = kit.findRoot();
if (!root) { console.error('No job folder here (no profile.json with jobkit_version in this folder or above). Run job-setup first.'); process.exit(1); }
const profile = kit.loadProfile(root);
const rel = p => path.relative(root, p).split(path.sep).join('/');
const kinds = ['resumes', 'coverletters'];

if (cmd === 'today' && kinds.includes(rest[0])) {
  const dir = path.join(kit.kindDir(root, rest[0], profile), kit.formatDate(new Date(), kit.dateFormat(root, profile)));
  fs.mkdirSync(path.join(dir, 'pdf'), { recursive: true });
  console.log(dir);
} else if (cmd === 'latest' && kinds.includes(rest[0])) {
  const [newest] = kit.datedFolders(root, rest[0], profile);
  if (!newest) { console.log(`No dated ${rest[0]} folders yet.`); process.exit(0); }
  console.log(newest.path);
  for (const doc of kit.documentsIn(newest.path)) console.log('  ' + rel(doc));
} else if (cmd === 'guess' && rest.length) {
  const order = kit.dateFormat(root, profile) === 'D-M-YYYY' ? 'DM' : 'MD';
  for (const f of rest) {
    const fromName = kit.parseDate(path.basename(f), order);
    const date = fromName ? fromName.date : fs.statSync(f).mtime;
    const how = fromName ? (fromName.ambiguous ? 'filename (AMBIGUOUS day/month, confirm)' : 'filename') : 'modified time';
    console.log(`${kit.formatDate(date, 'YYYY-MM-DD')}  ${how}  ${f}`);
  }
} else if (cmd === 'status') {
  console.log(status());
} else {
  console.error('Usage: node dates.js today|latest resumes|coverletters  |  guess <file>...  |  status');
  process.exit(2);
}

function status() {
  const lines = [`Job folder: ${root}`];
  const updated = profile.updated ? new Date(profile.updated + 'T00:00:00') : null;
  if (updated && !isNaN(updated)) {
    const days = Math.floor((Date.now() - updated) / 86400000);
    const stale = days > (profile.settings?.profile_stale_days ?? 30);
    lines.push(`Profile updated ${profile.updated} (${days} day${days === 1 ? '' : 's'} ago${stale ? ', STALE: ask the user what has changed' : ''}).`);
  } else {
    lines.push('Profile has no "updated" date yet: it has not been filled in.');
  }
  for (const k of kinds) {
    const [newest] = kit.datedFolders(root, k, profile);
    const docs = newest ? kit.documentsIn(newest.path) : [];
    const label = k === 'resumes' ? 'resume' : 'cover letter';
    lines.push(newest
      ? `Newest ${label}: ${rel(newest.path)}/${docs.length ? ` (${docs.map(d => path.basename(d)).join(', ')})` : ' (no PDF yet)'}`
      : `Newest ${label}: none yet.`);
  }
  const open = (profile.open_questions || []).length;
  if (open) lines.push(`${open} open question${open === 1 ? '' : 's'} in profile.json waiting for the user.`);
  const counts = trackerCounts();
  if (counts) lines.push(`Applications: ${counts}.`);
  lines.push(`New folders use ${kit.dateFormat(root, profile)}, dated with today's date: ${kit.formatDate(new Date(), kit.dateFormat(root, profile))}.`);
  return lines.join('\n');
}

function trackerCounts() {
  const file = path.join(root, 'tracker.md');
  if (!fs.existsSync(file)) return null;
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim().startsWith('|'));
  const header = rows.find(r => /\|\s*status\s*\|/i.test(r));
  if (!header) return null;
  const col = header.split('|').map(c => c.trim().toLowerCase()).indexOf('status');
  const tally = {};
  for (const r of rows.slice(rows.indexOf(header) + 2)) {
    const s = (r.split('|')[col] || '').trim().replace(/\*/g, '');
    if (s) tally[s] = (tally[s] || 0) + 1;
  }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return total ? `${total} (${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', ')})` : null;
}
