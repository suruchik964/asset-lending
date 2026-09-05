# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

- **Chose:** A librarian can issue/return/mark-lost ANY item in the catalogue, regardless of whether
  they're listed as a custodian of it.
- **Rejected:** Restricting issue/return/mark-lost actions to only the librarians who are custodians
  of that specific item.
- **Why:** I read custodianship as tracking who's responsible for an item's condition and location,
  not as an access-control mechanism — nothing in the brief says custodians are the only ones allowed
  to act on an item. Turning it into a permission gate would also break ordinary real-world cases,
  like one librarian covering for another who's out sick. Keeping "librarian" as the one role that
  can perform these actions matches how the brief is actually worded, and it's simpler for me to
  reason about and test.

## Decision 2

- **Chose:** An item can't be issued on a new loan only if it already has another loan with status
  exactly `ISSUED`. Loans still sitting at `REQUESTED` on the same item don't block a new issue.
- **Rejected:** Blocking a new issue if the item has any other loan in `REQUESTED` **or** `ISSUED`
  status.
- **Why:** I implemented the broader block first, but hit a real problem with it almost immediately:
  an item became permanently unissuable the moment it had two pending requests, since old test
  requests just sat there with no way to clear them. That's when I realized "Requested" is just
  someone asking, not a reservation — only "Issued" means the item is actually in someone's hands.
  The simpler model is the correct one: multiple people can raise their hand for the same item, and
  the librarian decides who gets it, without needing a separate reject/cancel feature for stale
  requests.
  - **Later reversed:** yes — this was the second version of the rule. I built and tested the first
    version (block on Requested-or-Issued) first, then reversed it to the current, simpler version
    after running into the real problem it caused during manual testing.

## Decision 3

- **Chose:** Marking a loan "Lost" automatically archives the underlying item (`item.archived =
  true`), and the issue endpoint separately rejects issuing against an archived item.
- **Rejected:** Leaving the item active/available after a loss, and just relying on the open-loan
  check to prevent re-issuing.
- **Why:** A lost item doesn't physically exist to lend anymore, so leaving it visible and requestable
  in the catalogue would be misleading — a member could request an item that will never actually be
  issued to them. Auto-archiving reuses the archive/restore mechanism I'd already built for goal 2
  instead of inventing a new item state, and it gives librarians a clear, deliberate action (Restore)
  if the item is later found or replaced.

## Decision 4

- **Chose:** Routes and their business logic live together in one file per resource (e.g.
  `routes/loans.js` holds both the Express route definitions and the Prisma queries/lifecycle rules),
  rather than splitting into separate `routes/` and `controllers/` folders.
- **Rejected:** A conventional `routes/` + `controllers/` (+ `services/`) layered structure.
- **Why:** For a project this size — a handful of resources, built under a real time budget — I found
  a routes-only structure kept each resource's behavior readable top-to-bottom in one file, without
  jumping between files to trace a single request. The layered split earns its cost when routes get
  large or logic needs reusing across many endpoints; neither was true here, so I didn't think the
  extra indirection was worth it.

## Decision 5

- **Chose:** Pinned Prisma to major version 6 (`prisma@6`, `@prisma/client@6`) instead of the latest
  version available at the time.
- **Rejected:** Using Prisma 7 (the version `npm install prisma` pulled in by default).
- **Why:** Prisma 7 had just moved the database connection URL out of `schema.prisma` into a separate
  `prisma.config.ts` file with a different config API, released only days before I started this
  project. I didn't want to spend project time learning and debugging a brand-new, sparsely-documented
  config system for zero functional benefit, so I downgraded to 6 and stayed on the well-documented
  `datasource { url = env(...) }` pattern that matches virtually every existing Prisma tutorial —
  at no cost to any of the 10 required goals.