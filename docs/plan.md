# Plan

Answer each of these, in your own words.

- How did you break the work into sessions?
- What order did you build in, and why that order?
- What did you estimate versus what it actually took?
- What did you cut when you ran short?

## How the work was broken into sessions

Roughly four phases, each treated as its own working session:

1. **Project + infrastructure setup** — GitHub repo, Supabase Postgres project, Prisma schema and
   first migration, bare Express server with a health check. Goal: have a real, deployable skeleton
   before writing any actual feature logic.
2. **Backend, goal by goal** — built and manually tested each of the 10 required goals against the
   live API (via PowerShell/curl requests) before moving to the next one: auth → catalogue items +
   custodians → loan lifecycle → search/filter/pagination → bulk actions → dashboard → alerts. Each
   goal was committed separately once its API calls were confirmed working.
3. **Frontend, page by page** — scaffolded React + Vite + Tailwind, then built one page at a time
   (Login/Signup → layout/nav → Catalogue → Item Detail → Loans → Loan Detail → My Loans/My Items →
   Dashboard → Alerts), testing each page in the browser against the already-working backend before
   moving on.
4. **Deployment, hardening, and polish** — deployed backend (Render) and frontend (Vercel), then did a
   full pass of manual testing across every goal to catch integration bugs, fixed several real issues
   found only by clicking through the live app (see below), and did a visual/UX redesign pass.

## Build order, and why

Backend before frontend, and within the backend, goals were built in roughly the order they appear in
the brief (auth → items → loans → search → bulk → dashboard → alerts), because most later goals
depend on earlier ones existing first: loans can't be built without items and users to attach them to;
search/filter needs loans to already exist to search over; the dashboard needs loans and their
statuses to aggregate; alerts need issued loans with due dates to compute overdue status against.
Building strictly bottom-up like this meant every goal could be tested against real data left over
from the previous one, instead of testing against invented placeholder data.

Deployment was deliberately done *before* the app was 100% polished, once all 10 goals had working
APIs and a working (if plain-looking) UI — this surfaced real environment-specific problems early
(Vercel's SPA routing 404 on refresh, Prisma's major-version connection-string change) while there
was still time to fix them, rather than discovering them for the first time right before submission.

## Estimated vs. actual

The backend (all 10 goals' APIs) was estimated at roughly a third of the total time budget and mostly
matched that — the main overrun was unplanned time lost to environment issues that had nothing to do
with the actual business logic: a Prisma major-version mismatch that required downgrading and cleaning
up auto-generated files it left behind, and a route-ordering bug (`/export` being shadowed by a
`/:id` route declared earlier in the same file) that silently broke the CSV export endpoint until
caught by manual testing.

The frontend took longer than planned too, though for a different reason than the backend did — less
about any single hard problem and more about a string of small environment/tooling slip-ups early on
(a stray duplicated folder from a terminal command run in the wrong directory, a couple of edits that
didn't actually persist to disk the first time) that each cost a few minutes to notice and fix. None
of it was a hard technical problem, but it added up, and it's the reason I got stricter later on about
actually re-checking a file's real contents right after editing it instead of assuming the edit landed.

Deployment was estimated as quick and mostly was, though the Vercel SPA-routing 404 (routes 404'ing on
direct refresh) wasn't anticipated in advance and had to be fixed reactively after first deploying.

## What was cut / simplified when time was short

- **No separate "reject a pending request" feature.** Considered adding a formal `REJECTED` loan
  status so librarians could explicitly close out a stale request, but realized the underlying problem
  it was solving (old Requested loans blocking new issues) was better fixed by correcting the
  issue-conflict rule itself (only block on `ISSUED`, not `REQUESTED`) — see `docs/decisions.md`. This
  turned out to be the simpler and more correct fix, so the more complex reject-feature was
  deliberately not built at all, rather than cut for time.
- **Custodian assignment by raw ID rather than a proper name/email search.** The custodian-assignment
  form initially required pasting a user's UUID directly rather than searching by name — flagged
  explicitly as a known rough edge rather than fixed immediately, in favor of finishing all 10
  functional goals first before improving that specific piece of UX.
- **routes/controllers separation.** Deliberately kept route handlers and their business logic in a
  single file per resource rather than splitting into a layered `routes/`+`controllers/` structure —
  a scope simplification made intentionally, not a cut made under time pressure (see
  `docs/decisions.md`).