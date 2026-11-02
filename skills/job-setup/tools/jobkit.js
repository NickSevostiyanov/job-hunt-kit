// Shared helpers: find the job folder, read settings, and handle dated folders
// in any common date style. Everything is computed live from the clock and the
// folders on disk, so "today" and "newest" are never stored anywhere.
const fs = require('fs');
const path = require('path');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// Nearest folder at or above `start` holding a profile.json with jobkit_version.
function findRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    const p = readJson(path.join(dir, 'profile.json'));
    if (p && p.jobkit_version) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function loadProfile(root) {
  return readJson(path.join(root, 'profile.json')) || {};
}

// Folder for resumes or cover letters: the setting, else an existing folder
// with a familiar name (RESUMES, CV, Cover Letters...), else the default.
function kindDir(root, kind, profile = loadProfile(root)) {
  const set = profile.settings?.folders?.[kind];
  if (set) return path.join(root, set);
  const pattern = kind === 'resumes' ? /^(resumes?|cvs?)$/i : /^cover[\s_-]?letters?$/i;
  const hit = fs.readdirSync(root, { withFileTypes: true }).find(e => e.isDirectory() && pattern.test(e.name));
  return path.join(root, hit ? hit.name : kind);
}

// Pull a date out of a file or folder name. Handles 2026-11-02, 2026_11_02,
// 20261102, 11-2-2026, 2-11-2026, "Nov 2 2026" and "2 November 2026".
// `order` ('MD' or 'DM') settles A-B-YYYY names when both parts are <= 12.
function parseDate(name, order = 'MD') {
  let m = name.match(/(?<!\d)(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})(?!\d)/);
  if (m) return mk(+m[1], +m[2], +m[3], false);
  m = name.match(/(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/);
  if (m) return mk(+m[1], +m[2], +m[3], false);
  m = name.match(/(?<!\d)(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})(?!\d)/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    if (a > 12) return mk(y, b, a, false);
    if (b > 12) return mk(y, a, b, false);
    return order === 'DM' ? mk(y, b, a, a !== b) : mk(y, a, b, a !== b);
  }
  m = name.match(/([a-z]{3,9})[\s_-]+(\d{1,2})(?:st|nd|rd|th)?,?[\s_-]+(\d{4})/i);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return mk(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2], false);
  m = name.match(/(\d{1,2})(?:st|nd|rd|th)?[\s_-]+([a-z]{3,9}),?[\s_-]+(\d{4})/i);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return mk(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1], false);
  return null;
}

function mk(y, mo, d, ambiguous) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const date = new Date(y, mo - 1, d);
  return date.getMonth() === mo - 1 ? { date, ambiguous } : null;
}

// Date style for new folders: the setting, else whatever the user's existing
// dated folders already use, else ISO (sorts correctly everywhere).
function dateFormat(root, profile = loadProfile(root)) {
  const set = profile.settings?.date_format;
  if (set) return set;
  const names = ['resumes', 'coverletters'].flatMap(k => {
    const d = kindDir(root, k, profile);
    return fs.existsSync(d) ? fs.readdirSync(d) : [];
  });
  if (names.some(n => /^\d{4}-\d{2}-\d{2}/.test(n))) return 'YYYY-MM-DD';
  // Majority vote, so one odd folder can't flip the order. A tie means month first.
  const dashed = names.map(n => n.match(/^(\d{1,2})-(\d{1,2})-\d{4}/)).filter(Boolean);
  if (!dashed.length) return 'YYYY-MM-DD';
  const dayFirst = dashed.filter(m => +m[1] > 12).length;
  const monthFirst = dashed.filter(m => +m[2] > 12).length;
  return dayFirst > monthFirst ? 'D-M-YYYY' : 'M-D-YYYY';
}

function formatDate(date, format) {
  const Y = date.getFullYear(), M = date.getMonth() + 1, D = date.getDate();
  if (format === 'M-D-YYYY') return `${M}-${D}-${Y}`;
  if (format === 'D-M-YYYY') return `${D}-${M}-${Y}`;
  return `${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
}

// Dated subfolders of resumes/ or coverletters/, newest first. Folder names may
// carry a suffix ("2026-06-03-sales"); a folder without a date is skipped.
function datedFolders(root, kind, profile = loadProfile(root)) {
  const dir = kindDir(root, kind, profile);
  if (!fs.existsSync(dir)) return [];
  const order = dateFormat(root, profile) === 'D-M-YYYY' ? 'DM' : 'MD';
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => ({ name: e.name, path: path.join(dir, e.name), parsed: parseDate(e.name, order) }))
    .filter(f => f.parsed)
    .sort((a, b) => b.parsed.date - a.parsed.date || a.name.localeCompare(b.name));
}

// Finished documents in a dated folder: PDFs in pdf/ (or loose), newest first.
function documentsIn(folder) {
  const pdfDir = path.join(folder, 'pdf');
  const dirs = fs.existsSync(pdfDir) ? [pdfDir, folder] : [folder];
  return dirs.flatMap(d => fs.readdirSync(d)
    .filter(f => /\.(pdf|docx?)$/i.test(f))
    .map(f => path.join(d, f)))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

module.exports = { findRoot, loadProfile, kindDir, parseDate, dateFormat, formatDate, datedFolders, documentsIn };
