---
name: job-tracker
description: Log and update job applications in tracker.md (applied, rejected, interview, offer) and summarize the pipeline. Use when the user says they applied somewhere, pastes a rejection or interview email, asks "what's my status", or wants follow-ups.
---

# Tracker

`tracker.md` at the job folder root, one table row per application. If the user already has their own tracker (another file name, other columns), use it as it is and keep its format.

## Updating

- **New application:** add a row. Give it the next `#`, `Applied` date, company, role, posting link, and the exact resume and cover-letter PDF paths sent. Status is `Applied`.
- **Pasted email** (rejection, screen invite, offer): match it to its row by company and role. If the company has several rows and the email names a role, use that role; if it's still unclear, ask. Set the status and `Updated` date, and add a one-line note (who sent it, any next step or deadline). Never paste the full email into the tracker.
- **Dates:** use the email's date, not today's, when they differ. Check the system time zone if a timestamp looks an hour off.
- Edit the row in place, keep the history short in `Notes` ("Applied 2026-10-22; rejected 2026-11-02"), and never delete rows.

## Summary (when asked for status)

Start from `node ../job-setup/tools/dates.js status` (path relative to this skill's folder), then list:
- Interviews and deadlines coming up.
- `Applied` rows with no response after 10 days: offer a short follow-up draft (role, date applied, one relevant line). At most two follow-ups per application, at least a week apart. Only drafts: the user sends them. Note each one in `Notes`.
- After 30 days with no response, suggest marking the row `No response`.
- Companies with several open applications.

Keep the summary to a few lines plus that list.
