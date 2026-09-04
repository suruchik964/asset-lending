import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Users
  const librarian1 = await prisma.user.upsert({
    where: { email: "librarian1@example.com" },
    update: { name: "Alex Librarian" },
    create: {
      name: "Alex Librarian",
      email: "librarian1@example.com",
      passwordHash,
      role: "LIBRARIAN",
    },
  });
  const librarian2 = await prisma.user.upsert({
    where: { email: "librarian2@example.com" },
    update: { name: "Blair Librarian" },
    create: {
      name: "Blair Librarian",
      email: "librarian2@example.com",
      passwordHash,
      role: "LIBRARIAN",
    },
  });
  const member1 = await prisma.user.upsert({
    where: { email: "member1@example.com" },
    update: { name: "Casey Member" },
    create: { name: "Casey Member", email: "member1@example.com", passwordHash, role: "MEMBER" },
  });
  const member2 = await prisma.user.upsert({
    where: { email: "member2@example.com" },
    update: { name: "Dana Member" },
    create: { name: "Dana Member", email: "member2@example.com", passwordHash, role: "MEMBER" },
  });

  // Items
  const itemsData = [
    { title: "Canon EOS R5", category: "Camera", code: "CAM-101" },
    { title: "Sony A7 III", category: "Camera", code: "CAM-102" },
    { title: "Manfrotto Tripod", category: "Accessory", code: "ACC-101" },
    { title: "Epson Projector X200", category: "Projector", code: "PROJ-101" },
    { title: "Rode Wireless Mic", category: "Audio", code: "AUD-101" },
    { title: "DJI Ronin Gimbal", category: "Accessory", code: "ACC-102" },
  ];

  const items = [];
  for (const data of itemsData) {
    const item = await prisma.item.upsert({
      where: { code: data.code },
      update: {},
      create: data,
    });
    items.push(item);
  }

  // Custodians
  await prisma.custodian.upsert({
    where: { userId_itemId: { userId: librarian1.id, itemId: items[0].id } },
    update: {},
    create: { userId: librarian1.id, itemId: items[0].id },
  });
  await prisma.custodian.upsert({
    where: { userId_itemId: { userId: librarian2.id, itemId: items[3].id } },
    update: {},
    create: { userId: librarian2.id, itemId: items[3].id },
  });

  // Loans: one issued+overdue, one issued+on-time, one requested, one returned
  const existingLoans = await prisma.loan.count();
  if (existingLoans === 0) {
    // Overdue loan
    const overdueLoan = await prisma.loan.create({
      data: {
        itemId: items[1].id,
        borrowerId: member1.id,
        status: "ISSUED",
        requestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.loanEvent.create({
      data: { loanId: overdueLoan.id, type: "REQUESTED", actorId: member1.id },
    });
    await prisma.loanEvent.create({
      data: { loanId: overdueLoan.id, type: "ISSUED", actorId: librarian1.id },
    });

    // On-time issued loan
    const onTimeLoan = await prisma.loan.create({
      data: {
        itemId: items[4].id,
        borrowerId: member2.id,
        status: "ISSUED",
        requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.loanEvent.create({
      data: { loanId: onTimeLoan.id, type: "REQUESTED", actorId: member2.id },
    });
    await prisma.loanEvent.create({
      data: { loanId: onTimeLoan.id, type: "ISSUED", actorId: librarian2.id },
    });

    // Pending request
    const pendingLoan = await prisma.loan.create({
      data: {
        itemId: items[5].id,
        borrowerId: member1.id,
        status: "REQUESTED",
        requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.loanEvent.create({
      data: { loanId: pendingLoan.id, type: "REQUESTED", actorId: member1.id },
    });

    // Returned loan (history)
    const returnedLoan = await prisma.loan.create({
      data: {
        itemId: items[2].id,
        borrowerId: member2.id,
        status: "RETURNED",
        requestedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        returnedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.loanEvent.create({
      data: { loanId: returnedLoan.id, type: "REQUESTED", actorId: member2.id },
    });
    await prisma.loanEvent.create({
      data: { loanId: returnedLoan.id, type: "ISSUED", actorId: librarian1.id },
    });
    await prisma.loanEvent.create({
      data: {
        loanId: returnedLoan.id,
        type: "RETURNED",
        actorId: librarian1.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log(
    "Login as: librarian1@example.com / password123 (or librarian2, member1, member2)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
