---
name: cover-letter
description: Write a one-page cover letter tailored to a specific job posting using only facts from the user's profile.json, file it in today's dated folder, render the PDF and verify it. Use when the user asks for a cover letter, invokes /cover-letter <company> <role>, or an application requires one.
---

# Cover letter

`TOOLS` = the `tools/` folder of the `job-setup` skill (`../job-setup/tools/` from this skill's folder). If `node TOOLS/dates.js status` fails, run `job-setup` first. You need the posting itself, as a URL or pasted text. Never write from the job title alone.

## Steps

1. **Load context.** Read `profile.json` and respect `rules`, `do_not_claim` and `no_ai_employers`. Check `tracker.md` for earlier applications to this company. Run `node TOOLS/dates.js latest coverletters` and read the newest letter: match its voice and layout unless the user wants a change. Save the posting to `postings/<company>-<role>-<YYYY-MM-DD>.md`.
2. **AI-ban check.** If the company is in `no_ai_employers` or the posting bans AI-written material, stop. Give the user fact bullets mapped to the posting so they can write it themselves.
3. **Map before writing.** Pick the posting's 3-4 most important requirements and pair each with a profile highlight and its evidence. If a requirement has no match, tell the user in one line how the letter handles it (honest adjacent experience, or leave it out). If the posting asks questions, answer them.
4. **Make the file.** `node TOOLS/dates.js today coverletters` prints today's folder (it's created if needed). Start from the newest letter, or `templates/coverletter.html` (the job folder's copy, else `../job-setup/kit/templates/`). Name it `coverletter_<company>[_<role>]_<date>.html`, using a lowercase company name with no spaces and a role slug if there's more than one letter for that company. Fill every `{{PLACEHOLDER}}`.
5. **Render and verify.** Run `node TOOLS/render.js <file.html>`. It must print `OK` with no warnings. If it's over one page, cut words. Never shrink the font or margins.
6. **Log it.** Add or update the `tracker.md` row with the PDF path. Merge any new fact the user mentioned into the profile (`job-profile` rules).
7. **Report** the PDF path, page count, and any gap the letter works around.

## Writing rules

- One page, plain words, short paragraphs. Open with the role and the line in the posting the user fits best. No "I am thrilled/excited", no buzzwords, no retelling the resume line by line.
- Every claim traces to a profile highlight. Use numbers exactly as stored, with their scope ("on a fixed 45-case test set", not a bare percentage).
- Close with location, work authorization and availability from `identity`, plus one link.
- A revision is a **new** file in today's folder. Never edit letters in older folders: they're the record of what each employer received.
- If the form has a text box instead of an upload, also write `<same name>.txt`: plain text, no HTML entities, signature with phone and email.
