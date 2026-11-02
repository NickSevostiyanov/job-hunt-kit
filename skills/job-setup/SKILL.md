---
name: job-setup
description: First run of job-hunt-kit. Turns a folder into an organized job search (profile.json, tracker, date-filed resumes and cover letters), adopts any existing resume/cover-letter folders and date style, then imports whatever the user has. Use when the user says "set up my job folder", starts a job search, or any job-hunt-kit skill finds no profile.json.
---

# Job folder setup

**Tools:** `TOOLS` means the `tools/` folder next to this SKILL.md. Every job-hunt-kit skill runs these from the plugin, never from copies, so plugin updates reach every user. All need Node 18+.

## 1. Pick the folder

Use the current directory unless the user names another. Run `node TOOLS/dates.js status` there. If it prints a status, the folder is already set up: show the status and offer `job-import` instead. Stop here.

## 2. Look before creating

List the folder (top level and one level down). Note:
- existing resume or cover-letter folders under any common name (`Resumes`, `RESUMES`, `CV`, `Cover Letters`, `coverletters`),
- any dated subfolders and the date style they use,
- loose resumes, cover letters, postings and LinkedIn exports lying around.

**Adopt what exists.** If the user already has `RESUMES/10-27-2026/`, keep that folder name and that date style. Set `settings.folders` and `settings.date_format` in the profile to match. Only fall back to the defaults (`resumes/`, `coverletters/`, `YYYY-MM-DD`) for a fresh folder.

## 3. Create what's missing

From `kit/` next to this SKILL.md, copy `profile.template.json` to `profile.json` and `tracker.md` to `tracker.md`, plus `templates/` (the user can restyle these). Never overwrite an existing file. Create any missing folders:

```
profile.json      single source of truth about the user
tracker.md        one row per application
templates/        resume.html, coverletter.html
resumes/          <date>/ per version, PDFs in <date>/pdf/
coverletters/     <date>/ per batch, PDFs in <date>/pdf/
postings/         saved job ads
sources/          raw inputs: old resumes, LinkedIn exports
```

Fill `settings` in `profile.json`: `folders`, `date_format`, `paper` (ask Letter or A4 only if the location doesn't make it obvious; for A4, change `@page size` in both templates). Leave the page limits at 2 for resumes and 1 for cover letters unless the user wants others.

## 4. Import

Ask one question: **"What do you have? Drop in anything: a resume (any format), a folder of old applications, your LinkedIn URL or its Save-to-PDF, or just tell me about your experience."** Then follow the `job-import` skill on every item given, including loose files found in step 2 (with the user's OK before moving anything).

## 5. Finish

- Set `profile.updated` to today and add a `changelog` entry "Set up job folder".
- Run `node TOOLS/dates.js status` and show its output.
- Then a short summary: roles and projects imported, documents filed into dated folders, open questions to answer, and the one best next step (usually "send me a posting and I'll tailor your resume").

Don't print the profile JSON. Don't ask more than one question at a time.
