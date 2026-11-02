---
name: job-profile
description: Keep the user's job-search profile.json accurate and current. Merges new facts from any source, logs every change, and turns conflicts into questions instead of guesses. Use when the user says "update my profile", corrects a fact about their career, answers an open question, or when another job-hunt-kit skill learns something new.
---

# Profile upkeep

`profile.json` at the job folder root is where resumes and cover letters get every fact. If something isn't in it, it doesn't go in a document. To bring in files, links or exports, use `job-import`, which calls these rules.

## Merge rules

1. **Evidence on every highlight.** Each `highlights[]` item has `text`, `evidence` (how someone could check it), `source` (`linkedin-pdf`, `linkedin-export`, `linkedin-public`, `resume-<date>`, `coverletter-<date>`, `chat`) and `as_of`. If a number has no evidence, ask for it or leave the number out. Never invent, round up or merge numbers.
2. **Conflicts become questions.** If new input disagrees with the profile (dates, title, on-site vs remote, active vs ended), add `{ "question", "options", "raised" }` to `open_questions` and ask. Apply the answer, remove the question, and if it could come up again, add a `rules` entry (e.g. "Title at Acme is IT Support Technician, never Sysadmin").
3. **Honest skill tiers.** `shipped` means used in real work or a finished project. `familiar` means used lightly. `coursework` means studied only. If the user says they never really used something, move it to `do_not_claim` with the reason. Ask before deleting coursework.
4. **Rules are binding.** `rules` holds hard lines: titles, people not to name, things not to disclose. `no_ai_employers` lists companies that ban AI-written applications; for those, the user gets fact bullets, never finished prose.
5. **Dates as `YYYY-MM`** for roles (`end: null` means current) and `YYYY-MM-DD` for `as_of`, `updated` and the changelog, whatever style the folders use.
6. **Log every change.** Append `{ "date", "change", "source" }` to `changelog` in plain English and set `updated` to today.
7. **Stay valid.** After every write, run `node -e "JSON.parse(require('fs').readFileSync('profile.json','utf8'))"` and fix any error immediately.

## Freshness

The session-start status line says when the profile is stale (older than `settings.profile_stale_days`). When it is, ask once: "Anything new since <date>? New role, project, skill, or a LinkedIn update?"

## LinkedIn comparison

When LinkedIn data comes in, report three short lists: **new** (added to the profile), **different** (became open questions) and **missing from LinkedIn** (in the profile but not on LinkedIn, worth adding there).

## Output

What changed, in a few lines, then any open questions. Never print the whole file.
