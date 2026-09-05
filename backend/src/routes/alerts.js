import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("LIBRARIAN"));

// Shared helper: get all currently-active (non-dismissed) overdue alerts
async function getActiveAlerts() {
  const now = new Date();

  const overdueLoans = await prisma.loan.findMany({
    where: { status: "ISSUED", dueDate: { lt: now } },
    include: {
      item: true,
      borrower: { select: { id: true, name: true, email: true } },
      dismissals: true,
    },
    orderBy: { dueDate: "asc" },
  });

  // A loan's alert is active unless it has a dismissal matching its current issuedAt
  return overdueLoans.filter((loan) => {
    const dismissedForThisCycle = loan.dismissals.some(
      (d) => d.issueKey.getTime() === loan.issuedAt.getTime(),
    );
    return !dismissedForThisCycle;
  });
}

// GET /api/alerts — list of active overdue alerts
router.get("/", async (req, res) => {
  const alerts = await getActiveAlerts();
  res.json(alerts.map(({ dismissals, ...loan }) => loan)); // strip dismissals from response
});

// GET /api/alerts/count — just the count, for the nav badge
router.get("/count", async (req, res) => {
  const alerts = await getActiveAlerts();
  res.json({ count: alerts.length });
});

// POST /api/alerts/:loanId/dismiss — dismiss the alert for this loan's current issue cycle
router.post("/:loanId/dismiss", async (req, res) => {
  const loan = await prisma.loan.findUnique({
    where: { id: req.params.loanId },
  });
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.status !== "ISSUED" || !loan.issuedAt) {
    return res
      .status(409)
      .json({ error: "This loan has no active overdue alert to dismiss" });
  }

  await prisma.$transaction(async (tx) => {
    const dismissalKey = {
      loanId_userId_issueKey: {
        loanId: loan.id,
        userId: req.user.userId,
        issueKey: loan.issuedAt,
      },
    };
    const existing = await tx.alertDismissal.findUnique({ where: dismissalKey });
    if (existing) return;

    await tx.alertDismissal.create({
      data: {
        loanId: loan.id,
        userId: req.user.userId,
        issueKey: loan.issuedAt,
      },
    });
    await tx.loanEvent.create({
      data: {
        loanId: loan.id,
        type: "NOTE",
        actorId: req.user.userId,
        note: "System action: overdue alert dismissed",
      },
    });
  });

  res.status(204).send();
});

export default router;
