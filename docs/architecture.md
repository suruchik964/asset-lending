# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?
- Where does each piece run?
- What is the request path for one representative user action, end to end?
- What did you decide *not* to build, and why?

## The moving pieces, and how they talk to each other

I ended up with three pieces, in a fairly standard shape:

1. **Frontend** — a React (Vite) single-page app. It never talks to the database directly; every
   piece of data it shows comes from calling my backend's REST API over HTTPS, through a single
   shared Axios client (`frontend/src/api/client.js`). That client automatically attaches a JWT
   (read from `localStorage`) as an `Authorization: Bearer` header on every outgoing request, via an
   Axios request interceptor, so individual pages never have to think about auth headers themselves.

2. **Backend** — a Node/Express REST API (`backend/src/index.js`), organized as one route file per
   resource: `auth.js`, `items.js`, `loans.js`, `dashboard.js`, `alerts.js`, and `users.js` (a small
   read-only endpoint I added to look up librarians by name for custodian assignment). I kept route
   handlers and their business logic together in the same file rather than splitting into separate
   controller/service layers — see `docs/decisions.md` for why. Two small middleware functions,
   `requireAuth` and `requireRole`, gate access: `requireAuth` verifies the JWT and attaches the
   decoded user to the request; `requireRole('LIBRARIAN')` additionally checks the role before letting
   a request reach a librarian-only handler.

3. **Database** — PostgreSQL, accessed exclusively through Prisma (`backend/prisma/schema.prisma`
   defines the six tables: User, Item, Custodian, Loan, LoanEvent, AlertDismissal). The backend is the
   only thing that ever talks to the database directly.

The frontend and backend only communicate over HTTP/JSON — there's no shared code, no server-side
rendering, no direct database access from the frontend. That separation meant I could deploy them
independently, which is exactly what happened: they run on two entirely different hosting platforms.

## Where each piece runs

- **Frontend**: deployed on Vercel, built from `frontend/` as a static Vite build. I added a
  `vercel.json` rewrite rule (`{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`) so
  every path is served `index.html` regardless of the URL, letting React Router handle client-side
  routing correctly — without this, refreshing or directly visiting any page other than `/` returned a
  404 from Vercel's static host, since as far as Vercel was concerned only `/` (and other real files)
  existed.
- **Backend**: deployed on Render as a Node web service, built from `backend/`. Render's build step
  runs `npm install`, `npx prisma generate`, and `npx prisma migrate deploy` before starting the
  server with `npm start`, so the database schema stays in sync with whatever's in
  `backend/prisma/migrations/` at deploy time.
- **Database**: hosted on Supabase (managed Postgres). The backend connects via two different
  connection strings — `DATABASE_URL` (a connection-pooled URL, port 6543, used for normal query
  traffic) and `DIRECT_URL` (a direct connection, port 5432, used specifically by Prisma Migrate,
  which needs a non-pooled connection to run schema migrations reliably).
- **Local development**: the same three pieces run locally too — Vite's dev server for the frontend
  (`localhost:5173`), `nodemon` running the Express server for the backend (`localhost:4000`), against
  the *same* Supabase database as production — I didn't set up a separate local database. That kept
  things simple, at the cost of local testing occasionally leaving clutter in what's technically the
  live dataset (I ended up writing a wipe/reseed script later specifically to clean that up).

## Request path for one representative action: a librarian issuing a loan

Walking through what happens when a librarian clicks "Issue" on a pending loan request, end to end:

1. **Frontend**: the Loans page (`frontend/src/pages/Loans.jsx`) has the librarian pick a due date,
   then calls `client.post('/loans/:id/issue', { dueDate })` through the shared Axios client.
2. **Auth header**: the Axios interceptor in `client.js` automatically attaches the JWT from
   `localStorage` as `Authorization: Bearer <token>` before the request leaves the browser.
3. **Network**: the request travels over HTTPS from the Vercel-hosted frontend to the Render-hosted
   backend's public URL, landing on `POST /api/loans/:id/issue`.
4. **Middleware**: Express runs `requireAuth` first — it verifies the JWT signature, and if valid,
   decodes it and attaches `{ userId, role }` to `req.user`. Then `requireRole('LIBRARIAN')` checks
   that `req.user.role === 'LIBRARIAN'`; a member's token gets rejected here with a 403, before it
   ever reaches the actual route logic.
5. **Route handler** (`backend/src/routes/loans.js`, the `/:id/issue` handler): looks up the loan by
   id, confirms its status is currently `REQUESTED` (rejects otherwise), looks up the underlying item
   and rejects if it's archived, then queries for any *other* loan on that same item with status
   exactly `ISSUED` and rejects if one exists — the two checks that stop double-issuing or issuing a
   lost/archived item.
6. **Database write**: if all checks pass, a Prisma `$transaction` updates the loan's `status` to
   `ISSUED` and sets `issuedAt`/`dueDate`, and creates a new `LoanEvent` row (`type: 'ISSUED'`,
   `actorId` the librarian's id) in the same atomic operation — so the loan's state and its audit
   trail entry can never end up out of sync with each other.
7. **Response**: the updated loan comes back as JSON.
8. **Frontend**: the Loans page receives the response, re-fetches the loans list (or updates local
   state), and the UI reflects the new "Issued" status immediately — including its `StatusBadge`
   showing the right color, and, if now overdue, that computed state too.

Every state-changing action in the app (request, issue, return, lost, dismiss) follows this same
shape: frontend call with auth header → middleware gate → business-rule checks in the route handler →
atomic database write (state change + audit event together where relevant) → JSON response → UI
update.

## What I decided *not* to build, and why

- **No server-side rendering or a meta-framework (Next.js, Remix, etc.).** A plain Vite SPA was
  enough — this app sits entirely behind a login wall, so nothing needs to be indexed by search
  engines or rendered for a logged-out crawler. SSR would have added build complexity without solving
  a real problem I actually had.
- **No separate `controllers/`/`services/` layer on the backend.** Covered in `docs/decisions.md` —
  I kept routes and their logic together in one file per resource, which felt simpler and more
  readable at this project's actual size.
- **No formal automated test suite (Jest/Vitest) as part of the initial build.** I relied on manual
  testing — direct API calls, then the real browser UI — to verify each of the 10 goals as I built
  them. I added a lightweight, targeted regression test script later
  (`backend/test-regression.js`), specifically for the loan issue-conflict rules, once that logic
  regressed more than once during a later redesign pass — I added that reactively where it actually
  mattered, rather than building a full test suite upfront for a fixed-scope assignment.
- **No WebSocket/real-time updates.** Alerts, dashboard numbers, and loan lists all get fetched fresh
  on page load or action rather than pushed live to open browser tabs. Nothing in the 10 required
  goals asks for real-time multi-user sync, and adding it would have meant a second communication
  channel alongside the REST API for no required benefit.
- **No custodian-based permission restrictions.** I considered this and rejected it — see
  `docs/decisions.md` — any librarian can act on any item; custodianship is informational, not a
  permission gate.
- **No formal "reject a pending request" feature/status.** I considered this too, then decided not to
  build it — the underlying problem (stale requests blocking new issues) was better solved by fixing
  the issue-conflict rule itself instead (see `docs/decisions.md`).
  