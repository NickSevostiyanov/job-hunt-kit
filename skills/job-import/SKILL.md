---
name: job-import
description: Take anything job-related the user throws in (a resume or cover letter in any format, a whole folder of old applications, a LinkedIn URL, export or PDF, a job posting, a recruiter email, or plain notes), file it into the right dated folder, and merge new facts into profile.json. Use when the user shares a file, folder, link or text about their career or an application, or says "add this", "import", "here's my resume".
---

# Import anything

`TOOLS` = the `tools/` folder of the `job-setup` skill (`../job-setup/tools/` from this skill's folder). If there's no job folder yet (`node TOOLS/dates.js status` fails), run `job-setup` first.

## 1. Read it

| Input | How |
|---|---|
| PDF, image, screenshot | Read tool |
| .docx, .odt, .html, .md, .txt, .rtf | `node TOOLS/extract.js <file>` |
| .doc, .pages | ask for PDF or .docx |
| A folder | list it recursively, then handle each file; skip duplicates (same name and size) |
| LinkedIn URL | try fetching it. Public profiles often return only a name and headline, or a login wall. Use whatever comes back (source `linkedin-public`), then ask for **More > Save to PDF** for the full profile. Never log in or automate LinkedIn |
| LinkedIn data export (ZIP or CSVs) | `Positions.csv`, `Education.csv`, `Skills.csv`, `Profile.csv`, `Projects.csv`, `Certifications.csv` |
| Pasted text or notes | as given |

Where originals go: resumes and cover letters are filed into dated folders (step 3), job postings go to `postings/<company>-<role>-<YYYY-MM-DD>.md`, and everything else (LinkedIn PDFs and exports, transcripts, notes) is kept in `sources/` with the date in the name.

## 2. Decide what it is

Resume, cover letter, job posting, LinkedIn profile, application email (confirmation, rejection, interview, offer), or career notes. If it's unclear, ask.

## 3. File it by date

Resumes and cover letters go into dated folders so that newest is always current:

1. `node TOOLS/dates.js guess <file>` gives the date from the filename, else from the file's modified time. Prefer a date written inside the document (a cover letter's date line) when there is one. If it says AMBIGUOUS, ask.
2. Target: `<resumes or coverletters folder>/<that date in the folder's date style>/`, with PDFs in `pdf/` and sources (.html, .docx) beside them. Keep the original filename.
3. Show the plan as a short `from -> to` list. **Copy** files that came from outside the job folder; **move** loose files already inside it only after the user says yes. Never overwrite: if the name exists, add `-2`.

After filing, `node TOOLS/dates.js latest resumes` should point at the user's actual current resume. If the user says a different one is their best ("my best tailored resume is X"), record that in `profile.settings.best_resume` and treat it as the base for new versions.

## 4. Merge facts

For resumes, cover letters, LinkedIn and notes, apply the `job-profile` merge rules. In short:
- add roles, projects, education, skills and highlights with `source` and `as_of`;
- turn conflicts into `open_questions`, never silent overwrites;
- never invent numbers.

A strong cover letter is a good source of highlights with context.

For application emails, update `tracker.md` per the `job-tracker` skill. For postings, add a `Drafting` row only if the user says they'll apply.

## 5. Report

A few lines: what was filed where, what was added to the profile, what conflicts need an answer. Then run `node TOOLS/dates.js status`.
