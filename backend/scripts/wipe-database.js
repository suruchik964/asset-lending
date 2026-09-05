import "dotenv/config";
import prisma from "../src/lib/prisma.js";

async function main() {
  console.log("Wiping all data...");

  // Delete in an order that respects foreign key dependencies
  await prisma.alertDismissal.deleteMany({});
  await prisma.loanEvent.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.custodian.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("All data wiped.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
