import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const execute = process.argv.includes("--execute");
const itemTitles = ["Audit conflict item", "Role audit item", "Alert audit item"];
const codePrefixes = ["AUDIT-", "ROLE-", "ALERT-"];
const emailPrefixes = ["audit-lib-", "audit-member1-", "audit-member2-", "role-lib-", "role-member-", "alert-lib-", "alert-member-"];

const items = await prisma.item.findMany({
  where: {
    OR: [
      { title: { in: itemTitles } },
      ...codePrefixes.map((prefix) => ({ code: { startsWith: prefix } })),
    ],
  },
  select: { id: true, title: true, code: true },
});
const users = await prisma.user.findMany({
  where: {
    AND: [
      { email: { endsWith: "@example.test" } },
      { OR: emailPrefixes.map((prefix) => ({ email: { startsWith: prefix } })) },
    ],
  },
  select: { id: true, name: true, email: true },
});
const itemIds = items.map((item) => item.id);
const userIds = users.map((user) => user.id);
const loans = await prisma.loan.findMany({
  where: { OR: [{ itemId: { in: itemIds } }, { borrowerId: { in: userIds } }] },
  select: { id: true },
});
const loanIds = loans.map((loan) => loan.id);

const summary = { items, users, loanCount: loanIds.length };
if (!execute) {
  console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

const result = await prisma.$transaction(async (tx) => {
  const dismissals = await tx.alertDismissal.deleteMany({ where: { loanId: { in: loanIds } } });
  const events = await tx.loanEvent.deleteMany({ where: { OR: [{ loanId: { in: loanIds } }, { actorId: { in: userIds } }] } });
  const deletedLoans = await tx.loan.deleteMany({ where: { id: { in: loanIds } } });
  const custodians = await tx.custodian.deleteMany({ where: { OR: [{ itemId: { in: itemIds } }, { userId: { in: userIds } }] } });
  const deletedItems = await tx.item.deleteMany({ where: { id: { in: itemIds } } });
  const deletedUsers = await tx.user.deleteMany({ where: { id: { in: userIds } } });
  return { dismissals: dismissals.count, events: events.count, loans: deletedLoans.count, custodians: custodians.count, items: deletedItems.count, users: deletedUsers.count };
});

console.log(JSON.stringify({ mode: "executed", targeted: summary, deleted: result }, null, 2));
await prisma.$disconnect();
