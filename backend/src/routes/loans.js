import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { stringify } from "csv-stringify/sync";

const router = Router();

router.use(requireAuth);

// Helper: attach a computed isOverdue flag to a loan object
function withComputedStatus(loan) {
  const isOverdue =
    loan.status === "ISSUED" &&
    loan.dueDate &&
    new Date(loan.dueDate) < new Date();
  return { ...loan, isOverdue };
}

// GET /api/loans/export — librarian only. CSV of everything currently out on loan.
router.get('/export', requireRole('LIBRARIAN'), async (req, res) => {
  const loans = await prisma.loan.findMany({
    where: { status: 'ISSUED' },
    include: { item: true, borrower: { select: { email: true } } },
    orderBy: { dueDate: 'asc' },
  });

  const rows = loans.map(loan => ({
    itemTitle: loan.item.title,
    itemCode: loan.item.code,
    borrowerEmail: loan.borrower.email,
    issuedAt: loan.issuedAt ? loan.issuedAt.toISOString() : '',
    dueDate: loan.dueDate ? loan.dueDate.toISOString() : '',
    isOverdue: loan.dueDate && new Date(loan.dueDate) < new Date() ? 'yes' : 'no',
  }));

  const csv = stringify(rows, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="loans-on-loan.csv"');
  res.send(csv);
});

// GET /api/loans/mine — member's own loans
router.get("/mine", async (req, res) => {
  const loans = await prisma.loan.findMany({
    where: { borrowerId: req.user.userId },
    include: { item: true },
    orderBy: { requestedAt: "desc" },
  });
  res.json(loans.map(withComputedStatus));
});

// GET /api/loans — librarian only, basic list for now (search/filter/pagination comes next step)
// GET /api/loans — librarian only. Supports search, filters, sort, pagination — all server-side.
router.get('/', requireRole('LIBRARIAN'), async (req, res) => {
  const {
    q,               // text search: item title or borrower email
    status,          // REQUESTED | ISSUED | RETURNED | LOST | OVERDUE
    itemId,
    borrowerId,
    sortBy = 'requestedAt', // requestedAt | dueDate | status
    sortDir = 'desc',
    page = '1',
    pageSize = '20',
  } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);

  const where = {};

  if (itemId) where.itemId = itemId;
  if (borrowerId) where.borrowerId = borrowerId;

  // "OVERDUE" isn't a real stored status — it means ISSUED + past due date
  if (status === 'OVERDUE') {
    where.status = 'ISSUED';
    where.dueDate = { lt: new Date() };
  } else if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { item: { title: { contains: q, mode: 'insensitive' } } },
      { borrower: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = ['requestedAt', 'dueDate', 'status'];
  const orderBy = validSortFields.includes(sortBy)
    ? { [sortBy]: sortDir === 'asc' ? 'asc' : 'desc' }
    : { requestedAt: 'desc' };

  const [total, loans] = await prisma.$transaction([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      include: { item: true, borrower: { select: { id: true, email: true } } },
      orderBy,
      skip: (pageNum - 1) * sizeNum,
      take: sizeNum,
    }),
  ]);

  res.json({
    data: loans.map(withComputedStatus),
    pagination: {
      page: pageNum,
      pageSize: sizeNum,
      total,
      totalPages: Math.ceil(total / sizeNum),
    },
  });
});

// GET /api/loans/:id — full detail with event timeline
router.get("/:id", async (req, res) => {
  const loan = await prisma.loan.findUnique({
    where: { id: req.params.id },
    include: {
      item: true,
      borrower: { select: { id: true, email: true } },
      events: {
        include: { actor: { select: { id: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!loan) return res.status(404).json({ error: "Loan not found" });

  // Members can only view their own loans
  if (req.user.role === "MEMBER" && loan.borrowerId !== req.user.userId) {
    return res
      .status(403)
      .json({ error: "You do not have permission to view this loan" });
  }

  res.json(withComputedStatus(loan));
});

// POST /api/loans — request a loan. Member requests for self; librarian can specify borrowerId.
router.post("/", async (req, res) => {
  const { itemId } = req.body;
  let { borrowerId } = req.body;

  if (!itemId) return res.status(400).json({ error: "itemId is required" });

  if (req.user.role === "MEMBER") {
    borrowerId = req.user.userId; // members can only request for themselves
  } else if (!borrowerId) {
    return res
      .status(400)
      .json({
        error: "borrowerId is required when a librarian creates a loan",
      });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.archived) {
    return res.status(400).json({ error: "Item not found or archived" });
  }

  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: { itemId, borrowerId, status: "REQUESTED" },
    });
    await tx.loanEvent.create({
      data: { loanId: created.id, type: "REQUESTED", actorId: req.user.userId },
    });
    return created;
  });

  res.status(201).json(loan);
});

// POST /api/loans/:id/issue — librarian only
router.post("/:id/issue", requireRole("LIBRARIAN"), async (req, res) => {
  const { dueDate, note } = req.body;
  if (!dueDate)
    return res
      .status(400)
      .json({ error: "dueDate is required to issue a loan" });

  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.status !== "REQUESTED") {
    return res
      .status(409)
      .json({
        error: `Cannot issue a loan with status ${loan.status}. Only Requested loans can be issued.`,
      });
  }

  // The core rule: item cannot have any other open loan (Requested or Issued)
  const conflicting = await prisma.loan.findFirst({
    where: {
      itemId: loan.itemId,
      id: { not: loan.id },
      status: "ISSUED",
    },
  });
  if (conflicting) {
    return res
      .status(409)
      .json({
        error:
          "This item already has an open loan against it and cannot be issued again until that loan is returned or marked lost.",
      });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: "ISSUED",
        issuedAt: new Date(),
        dueDate: new Date(dueDate),
      },
    });
    await tx.loanEvent.create({
      data: {
        loanId: loan.id,
        type: "ISSUED",
        actorId: req.user.userId,
        note: note || null,
      },
    });
    return result;
  });

  res.json(updated);
});

// POST /api/loans/:id/return — librarian only
router.post("/:id/return", requireRole("LIBRARIAN"), async (req, res) => {
  const { note } = req.body;
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.status !== "ISSUED") {
    return res
      .status(409)
      .json({
        error: `Cannot return a loan with status ${loan.status}. Only Issued (or overdue) loans can be returned.`,
      });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.loan.update({
      where: { id: loan.id },
      data: { status: "RETURNED", returnedAt: new Date() },
    });
    await tx.loanEvent.create({
      data: {
        loanId: loan.id,
        type: "RETURNED",
        actorId: req.user.userId,
        note: note || null,
      },
    });
    return result;
  });

  res.json(updated);
});

// POST /api/loans/:id/lost — librarian only
router.post("/:id/lost", requireRole("LIBRARIAN"), async (req, res) => {
  const { note } = req.body;
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.status !== "ISSUED") {
    return res
      .status(409)
      .json({
        error: `Cannot mark a loan lost with status ${loan.status}. Only Issued (or overdue) loans can be marked lost.`,
      });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.loan.update({
      where: { id: loan.id },
      data: { status: "LOST" },
    });
    await tx.loanEvent.create({
      data: {
        loanId: loan.id,
        type: "LOST",
        actorId: req.user.userId,
        note: note || null,
      },
    });
    return result;
  });

  res.json(updated);
});

// POST /api/loans/:id/notes — librarian only, add a note to the timeline without changing status
router.post("/:id/notes", requireRole("LIBRARIAN"), async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: "note is required" });

  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: "Loan not found" });

  const event = await prisma.loanEvent.create({
    data: { loanId: loan.id, type: "NOTE", actorId: req.user.userId, note },
  });

  res.status(201).json(event);
});

// POST /api/loans/bulk-return — librarian only. Body: { loanIds: [...] }
router.post('/bulk-return', requireRole('LIBRARIAN'), async (req, res) => {
  const { loanIds, note } = req.body;
  if (!Array.isArray(loanIds) || loanIds.length === 0) {
    return res.status(400).json({ error: 'loanIds must be a non-empty array' });
  }

  const report = [];

  for (const loanId of loanIds) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });

    if (!loan) {
      report.push({ loanId, success: false, error: 'Loan not found' });
      continue;
    }
    if (loan.status !== 'ISSUED') {
      report.push({ loanId, success: false, error: `Cannot return a loan with status ${loan.status}` });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loanId },
        data: { status: 'RETURNED', returnedAt: new Date() },
      });
      await tx.loanEvent.create({
        data: { loanId, type: 'RETURNED', actorId: req.user.userId, note: note || null },
      });
    });

    report.push({ loanId, success: true });
  }

  res.json({
    total: loanIds.length,
    succeeded: report.filter(r => r.success).length,
    failed: report.filter(r => !r.success).length,
    report,
  });
});

export default router;
