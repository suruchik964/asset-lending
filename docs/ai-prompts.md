# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

## 1. Project setup

**What I was trying to achieve:** Scaffold the repo, database, and a bare backend before writing any features.

### Prompt
Step-by-step setup for Node/Express + Prisma + PostgreSQL + Supabase, as terminal commands.

### What you got
Working repo, Supabase project, and `npx prisma init`.

### What you corrected
`prisma init` defaulted to Prisma v7, released days earlier with a breaking config change. Downgraded to v6 to avoid an undocumented dependency.

## 2. Auth, catalogue, custodians

**What I was trying to achieve:** Goals 1, 2, and 5 — roles, items, custodians.

### Prompt
Schema correction + routes for signup/login and item CRUD/archive/custodian assignment.

### What you got
Working `auth.js` and `items.js` with role middleware.

### What you corrected
Nothing — tested and confirmed a member's token was correctly rejected on librarian-only routes.

## 3. Loan lifecycle

**What I was trying to achieve:** Goals 3 and 4 — requests, issuing, returns, the conflict rule.

### Prompt
Schema correction + routes for the loan lifecycle, with a rule blocking issue on an "open" loan.

### What you got
Working `loans.js` with an issue-conflict check.

### What you corrected
The check blocked on `REQUESTED` **or** `ISSUED`, so an item got stuck after two pending requests. Found this by testing, not reading code. Fixed to only block on `ISSUED`.

## 4. Search, bulk actions, dashboard, alerts

**What I was trying to achieve:** Goals 6–8 and 10.

### Prompt
Schema/route changes for search+pagination, CSV import/export/bulk-return, dashboard stats, alerts.

### What you got
Extended `loans.js`, new `dashboard.js` and `alerts.js`.

### What you corrected
`GET /api/loans/export` returned "Loan not found" — a `/:id` route declared earlier in the file was matching "export" as an id. Moved the specific route above it.

## 5. Frontend scaffold and pages

**What I was trying to achieve:** All pages, wired to the working backend.

### Prompt
React/Vite/Tailwind setup, then each page one at a time (auth, catalogue, loans, dashboard, alerts).

### What you got
Working pages using React Router and a shared API client.

### What you corrected
A couple of pasted files never actually saved to disk, causing a blank-page bug — caught by checking file contents directly instead of assuming the paste worked. Also found and removed a stray duplicated `src/src` folder.

## 6. Deployment

**What I was trying to achieve:** Get the app live on Render and Vercel.

### Prompt
Deployment steps for both, then help diagnosing a 404 on page refresh.

### What you got
Correct deployment steps and a correct diagnosis (SPA routing needs a rewrite rule).

### What you corrected
Added `vercel.json` so all paths serve `index.html`.

## 7. Frontend redesign — where something went wrong

**What I was trying to achieve:** A visual polish pass once all 10 goals worked, then an audit for regressions.

### Prompt
Full redesign (colors, components, charts, new landing page), then an audit against all 10 goals.

### What you got
A better-looking frontend, but the process broke things: the issue-conflict fix from #3 got reverted, the Alerts Dismiss button disappeared, and the audit's own test scripts left fake items in the real database.

### What you corrected
Caught the regression myself by testing again. Wrote a narrower follow-up naming the exact rule and query shape to fix, required a real regression test script proving it, and had the leftover test data removed. Went back to small, single-purpose prompts for anything touching backend logic after this.