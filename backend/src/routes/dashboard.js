import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("LIBRARIAN"));

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

router.get("/", async (req, res) => {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const eightWeeksAgo = new Date(weekStart);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7); // 8 weeks total including current

  // Headline numbers
  const [
    itemsOut,
    overdueCount,
    returnedThisWeek,
    totalItems,
    allLoansByStatus,
  ] = await Promise.all([
    prisma.loan.count({ where: { status: "ISSUED" } }),
    prisma.loan.count({ where: { status: "ISSUED", dueDate: { lt: now } } }),
    prisma.loan.count({
      where: { status: "RETURNED", returnedAt: { gte: weekStart } },
    }),
    prisma.item.count({ where: { archived: false } }),
    prisma.loan.groupBy({ by: ["status"], _count: true }),
  ]);

  // Breakdown by status (turn groupBy result into a clean object)
  const byStatus = { REQUESTED: 0, ISSUED: 0, RETURNED: 0, LOST: 0 };
  for (const row of allLoansByStatus) {
    byStatus[row.status] = row._count;
  }

  // Breakdown by custodian — count of currently-open loans (Requested/Issued) per custodian
  const custodians = await prisma.custodian.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      item: {
        include: {
          loans: { where: { status: { in: ["REQUESTED", "ISSUED"] } } },
        },
      },
    },
  });

  const byCustodianMap = {};
  for (const c of custodians) {
    const key = c.user.id;
    if (!byCustodianMap[key]) {
      byCustodianMap[key] = {
        userId: c.user.id,
        name: c.user.name,
        email: c.user.email,
        openLoans: 0,
      };
    }
    byCustodianMap[key].openLoans += c.item.loans.length;
  }
  const byCustodian = Object.values(byCustodianMap);

  // Items returned per week, last 8 weeks
  const recentReturns = await prisma.loan.findMany({
    where: { status: "RETURNED", returnedAt: { gte: eightWeeksAgo } },
    select: { returnedAt: true },
  });

  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const count = recentReturns.filter(
      (l) => l.returnedAt >= ws && l.returnedAt < we,
    ).length;
    weeks.push({ weekStart: ws.toISOString().slice(0, 10), count });
  }

  res.json({
    headline: {
      itemsOut,
      itemsOverdue: overdueCount,
      returnedThisWeek,
      totalItems,
    },
    byStatus,
    byCustodian,
    returnsPerWeek: weeks,
  });
});

export default router;
