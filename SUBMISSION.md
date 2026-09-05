# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/suruchik964/asset-lending
- **Live application:** https://asset-lending.vercel.app

## Notes for the reviewer

The backend is hosted on Render's free tier, which spins down after periods of inactivity — the
**first** request after idle time (e.g. logging in) can take up to 30–60 seconds to respond while it
wakes up. Every request after that is fast. If the login screen seems to hang on your first try, that's
why — just wait, it will come through.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Librarian | librarian1@example.com | password123 |
| Librarian | librarian2@example.com | password123 |
| Member | member1@example.com | password123 |
| Member | member2@example.com | password123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React (Vite) + React Router + Tailwind CSS + Axios | Fast dev loop, component model fits a page-per-resource app well, Tailwind kept styling consistent without a heavier component library |
| Backend | Node.js + Express + Prisma ORM | Express is minimal and unopinionated for a REST API this size; Prisma gives type-safe queries and migrations without hand-writing SQL for every route |
| Database | PostgreSQL (hosted on Supabase) | Relational data with real foreign-key relationships (users, items, loans, custodians) fits a relational model naturally; Supabase gave a free managed Postgres instance with zero setup |
| Hosting | Render (backend), Vercel (frontend) | Both offer free tiers with GitHub-integrated auto-deploy on push, which kept the deploy loop fast throughout development |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Email/password auth, JWT, LIBRARIAN/MEMBER roles enforced server-side via middleware, not just hidden in the UI |
| 2 | Catalogue items | Done | Create/edit/archive/restore; archiving preserves loan history and removes only from the default view |
| 3 | Loans | Done | Requested/issued/returned tracked with borrower, request date, due date; librarians can create loans directly for any borrower |
| 4 | Loan lifecycle with rules | Done | Requested → Issued → Returned/Lost; overdue computed on the fly, never stored; server rejects issuing an item with another open Issued loan or an archived/lost item |
| 5 | Custodians | Done | Many-to-many librarian↔item via a join table; "My Items" view per librarian |
| 6 | Finding loans | Done | Server-side text search, status/item/borrower filters, sorting, and pagination with total count |
| 7 | Bulk actions | Done | CSV import with per-row report, bulk-return with per-loan report, CSV export of everything currently out |
| 8 | Dashboard | Done | Headline counts, status/custodian breakdowns, items-returned-per-week chart |
| 9 | Immutable audit history | Done | Every loan has a timeline of requested/issued/returned/lost events plus notes; no edit/delete route exists for any of it |
| 10 | Overdue alerts | Done | Alerts list with nav badge count; dismissal is scoped to the loan's current issue cycle and reappears if the item is issued again and becomes overdue on a new loan |

## How much time did you actually spend?

<Fill in your honest total — this is personal to how you worked and I don't want to guess it for you.>

## What would you do next, with another 12 hours?

- Support quantity per item — right now every catalogue item is a single physical unit, but in
  practice something like "SD cards" or "HDMI cables" would exist as multiple identical units. I'd
  add a `quantity` field on Item and change the issue-conflict rule to check "are all N units
  currently out" instead of "is there any open loan at all" — that's a real gap in how the catalogue
  models the world right now, not just a nice-to-have.
- Add a proper automated test suite covering the loan lifecycle rules end to end, rather than relying
  mostly on manual testing plus the one targeted regression script that exists today
- Build a formal "reject/cancel a pending request" action for librarians, instead of the simpler rule
  that stale Requested loans just quietly stop blocking anything
- Add lightweight notifications (even just an in-app toast/email) when an item a member requested
  gets issued or when their loan is approaching its due date — right now they'd only find out by
  checking "My Loans" themselves
- Move the weekly-returns dashboard calculation from in-memory JavaScript bucketing to a proper SQL
  `GROUP BY` query, and add a real full-text search index for the loans search endpoint — both flagged
  in `docs/schema.md` as the first things to break at significantly higher data volume

## What are you least happy with in this codebase, and why?

The frontend's visual design went through more churn than the backend did — I focused most of my
early effort on getting the ten required behaviors correct end to end, and only circled back to make
the interface look and feel polished later on. That ordering was probably right for a graded
functional assignment, but it means the UI's design language isn't as consistently applied everywhere
as I'd like — a few pages still lean on plainer, more default-looking styling than the rest. Given
more time I'd want to go through every screen once more with a single, deliberate design system
(consistent spacing, one component library for buttons/cards/badges, one icon set) applied from the
start rather than layered on after the fact.