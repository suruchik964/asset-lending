# Schema

Answer each of these, in your own words.

- Table by table: what columns and types does each one have?
- Which relationships are one-to-many, and which are many-to-many?
- Which constraints are enforced by the database, and which by application code — and why did you draw the line there?
- What did you deliberately denormalise?
- What would break first if this had 100x the data?

## Table by table

**User**
- `id` — String (UUID), primary key
- `email` — String, unique
- `passwordHash` — String (bcrypt hash — I never store the raw password)
- `role` — enum: `LIBRARIAN` or `MEMBER`
- `createdAt` — DateTime, defaults to now

**Item**
- `id` — String (UUID), primary key
- `title` — String
- `category` — String
- `code` — String, unique (the human-facing identifying code, e.g. "CAM-101")
- `archived` — Boolean, defaults to false
- `createdAt` / `updatedAt` — DateTime

**Custodian** (join table, no surrogate id — composite primary key)
- `userId` — String, foreign key → User
- `itemId` — String, foreign key → Item
- The primary key is the pair `(userId, itemId)` together, so I can't accidentally add the same
  librarian as custodian of the same item twice

**Loan**
- `id` — String (UUID), primary key
- `itemId` — String, foreign key → Item
- `borrowerId` — String, foreign key → User
- `status` — enum: `REQUESTED`, `ISSUED`, `RETURNED`, `LOST` — defaults to `REQUESTED`
- `requestedAt` — DateTime, defaults to now
- `issuedAt` — DateTime, nullable (set only once issued)
- `dueDate` — DateTime, nullable (set only once issued)
- `returnedAt` — DateTime, nullable (set only once returned)
- I indexed `status`, `itemId`, and `borrowerId` since those are the columns the search/filter
  endpoint (goal 6) and the issue-conflict check (goal 4) query most often

**LoanEvent** (the immutable audit trail — goal 9)
- `id` — String (UUID), primary key
- `loanId` — String, foreign key → Loan
- `type` — enum: `REQUESTED`, `ISSUED`, `RETURNED`, `LOST`, `NOTE`
- `actorId` — String, foreign key → User (who performed the action)
- `note` — String, nullable
- `createdAt` — DateTime, defaults to now
- I never wrote an update or delete route for this table anywhere in the API — rows only ever get
  created, which is what actually makes the timeline immutable, not just a comment saying it should be

**AlertDismissal**
- `id` — String (UUID), primary key
- `loanId` — String, foreign key → Loan
- `userId` — String, foreign key → User (which librarian dismissed it)
- `issueKey` — DateTime (a copy of the loan's `issuedAt` value at the moment of dismissal)
- `createdAt` — DateTime, defaults to now
- Unique constraint on `(loanId, userId, issueKey)` together

## Relationships

- **User → Loan (as borrower):** one-to-many. One user can have many loans as the borrower; each loan
  has exactly one borrower.
- **User → LoanEvent (as actor):** one-to-many. One user can perform many logged actions; each event
  has exactly one actor.
- **Item → Loan:** one-to-many. One item can have many loans over its lifetime; each loan is for
  exactly one item.
- **Loan → LoanEvent:** one-to-many. One loan accumulates many timeline events; each event belongs to
  exactly one loan.
- **User ↔ Item, via Custodian:** many-to-many. A librarian can be custodian of many items, and an
  item can have many librarian-custodians — I needed the `Custodian` join table to represent this at
  all, since Prisma/relational models can't express many-to-many directly between two tables.
- **Loan ↔ User, via AlertDismissal:** effectively many-to-many between loans and the librarians who
  dismissed their alerts, though in practice each loan usually only gets dismissed by whoever's
  monitoring alerts at the time.

## Database-enforced vs. application-enforced constraints

**I let the database enforce:**
- Uniqueness: `User.email`, `Item.code`, the `Custodian` composite primary key, the `AlertDismissal`
  composite unique constraint. These are structural guarantees — no request path should ever be able
  to create a duplicate, so I wanted the database itself to make that impossible, not just
  discouraged in application code.
- Foreign keys: every `itemId`, `userId`, `loanId`, `borrowerId`, `actorId` reference is enforced by
  Postgres — it'll refuse to create a `Loan` pointing at an `Item` that doesn't exist.
- Required (non-nullable) columns: things like `Item.title` or `User.passwordHash` — a row without
  them shouldn't be able to exist, structurally.

**I put in application code (Express routes), not the database:**
- The loan lifecycle rules (goal 4) — "can't issue an item with another open ISSUED loan," "can't
  return a loan that isn't ISSUED," "can't issue an archived item," and so on. These depend on the
  current *state* of related rows, not something a column constraint or foreign key can express — I
  needed a real query at request time to check them.
- Role checks (goal 1) — "only a LIBRARIAN can create/archive items, issue/return/mark-lost loans."
  This is authorization tied to whoever's making the request, so it lives in Express middleware, not
  the schema.
- The alert dismissal reappearing after a new issue cycle (goal 10) — this is really a query-time
  interpretation of the data (comparing `AlertDismissal.issueKey` to the loan's current `issuedAt`),
  not something the database enforces directly.
- **Why I drew the line here:** anything that's a structural fact about the data itself — must be
  unique, must reference a real row, must not be null — I put in the schema, because the database can
  guarantee it even under concurrent requests. Anything that depends on business meaning or the
  current state of multiple rows relative to each other, I put in application code, because it needs
  actual query logic, not a static constraint.

## What I deliberately denormalised

Nothing here in the strict sense — no duplicated columns, no cached/derived values stored
redundantly. The closest related decision: I made sure **"Overdue" is never stored as a status at
all** — it's computed at query/response time from `status === 'ISSUED' && dueDate < now`, everywhere
it's needed (the loans list, the alerts endpoint, the dashboard counts). I did this deliberately to
avoid a stored value that could silently go stale — for example, if a background job meant to flip
loans to "Overdue" ever failed to run. Computing it fresh every time means it's always correct by
construction, at the small cost of one comparison at read time instead of a stored column.

## What would break first at 100x the data

I think the `GET /api/loans` search endpoint (goal 6) would be the first real bottleneck. Its `q` text
search uses Prisma's `contains`/`insensitive` filtering across `item.title` and `borrower.email`,
which becomes a Postgres `ILIKE '%...%'` query — that can't use a normal B-tree index efficiently
(a leading wildcard defeats standard indexing), so at 100x the rows I'd expect this to degrade into
slow, close-to-sequential scans under load. A proper full-text search index (Postgres
`tsvector`/`GIN`, or a dedicated search service) would be the real fix if this ever became a real
system. The dashboard's `returnsPerWeek` calculation, which currently pulls all returns from the last
8 weeks into memory and buckets them in JavaScript instead of doing the grouping in SQL, would also
get noticeably slower — that's a candidate for moving to a `GROUP BY` query.