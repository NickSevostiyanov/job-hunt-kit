#!/usr/bin/env node
// At session start inside a job folder, tell Claude what is current right now:
// profile freshness, newest resume and cover letter, application counts.
// Silent everywhere else, and never blocks the session.
const { execFileSync } = require('child_process');
const path = require('path');
try {
  const kit = require('../skills/job-setup/tools/jobkit');
  if (!kit.findRoot()) process.exit(0);
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'skills', 'job-setup', 'tools', 'dates.js'), 'status'], { encoding: 'utf8', timeout: 8000 });
  console.log(`job-hunt-kit status (live, use this as current):\n${out.trim()}`);
} catch { /* never break a session over a status line */ }
