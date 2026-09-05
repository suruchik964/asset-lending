import "dotenv/config";
import prisma from "./src/lib/prisma.js";

const baseUrl = process.env.TEST_API_URL || "http://localhost:4000/api";
const stamp = Date.now();
const created = { itemIds: [], loanIds: [], userIds: [] };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(path, { token, method = "GET", body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const payload = response.status === 204 ? null : await response.json();
  assert(response.status === expected, `${method} ${path}: expected ${expected}, got ${response.status} (${payload?.error || "no error"})`);
  return payload;
}

async function cleanup() {
  await prisma.$transaction(async (tx) => {
    await tx.alertDismissal.deleteMany({ where: { loanId: { in: created.loanIds } } });
    await tx.loanEvent.deleteMany({ where: { loanId: { in: created.loanIds } } });
    await tx.loan.deleteMany({ where: { id: { in: created.loanIds } } });
    await tx.custodian.deleteMany({ where: { OR: [{ itemId: { in: created.itemIds } }, { userId: { in: created.userIds } }] } });
    await tx.item.deleteMany({ where: { id: { in: created.itemIds } } });
    await tx.user.deleteMany({ where: { id: { in: created.userIds } } });
  });
}

try {
  const librarian = await api("/auth/signup", {
    method: "POST",
    expected: 201,
    body: { name: "Regression Test Librarian", email: `regression-lib-${stamp}@example.test`, password: "RegressionPass123!", role: "LIBRARIAN" },
  });
  const member = await api("/auth/signup", {
    method: "POST",
    expected: 201,
    body: { name: "Regression Test Member", email: `regression-member-${stamp}@example.test`, password: "RegressionPass123!", role: "MEMBER" },
  });
  created.userIds.push(librarian.user.id, member.user.id);
  const token = librarian.token;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const lostItem = await api("/items", { token, method: "POST", expected: 201, body: { title: "Regression Lost Item", category: "Test", code: `REGRESSION-LOST-${stamp}` } });
  created.itemIds.push(lostItem.id);
  const firstRequest = await api("/loans", { token, method: "POST", expected: 201, body: { itemId: lostItem.id, borrowerId: member.user.id } });
  const pendingRequest = await api("/loans", { token, method: "POST", expected: 201, body: { itemId: lostItem.id, borrowerId: member.user.id } });
  created.loanIds.push(firstRequest.id, pendingRequest.id);
  await api(`/loans/${firstRequest.id}/issue`, { token, method: "POST", body: { dueDate } });
  await api(`/loans/${firstRequest.id}/lost`, { token, method: "POST", body: {} });
  const archivedItem = await api(`/items/${lostItem.id}`, { token });
  assert(archivedItem.archived === true, "Lost item was not archived");
  await api("/loans", { token, method: "POST", expected: 400, body: { itemId: lostItem.id, borrowerId: member.user.id } });
  await api(`/loans/${pendingRequest.id}/issue`, { token, method: "POST", expected: 409, body: { dueDate } });
  console.log("PASS Check A: Lost item is archived; new requests and pending-request issue are rejected.");

  const normalItem = await api("/items", { token, method: "POST", expected: 201, body: { title: "Regression Issued Conflict Item", category: "Test", code: `REGRESSION-ISSUED-${stamp}` } });
  created.itemIds.push(normalItem.id);
  const firstNormalRequest = await api("/loans", { token, method: "POST", expected: 201, body: { itemId: normalItem.id, borrowerId: member.user.id } });
  const secondNormalRequest = await api("/loans", { token, method: "POST", expected: 201, body: { itemId: normalItem.id, borrowerId: member.user.id } });
  created.loanIds.push(firstNormalRequest.id, secondNormalRequest.id);
  await api(`/loans/${firstNormalRequest.id}/issue`, { token, method: "POST", body: { dueDate } });
  await api(`/loans/${secondNormalRequest.id}/issue`, { token, method: "POST", expected: 409, body: { dueDate } });
  await api(`/loans/${firstNormalRequest.id}/return`, { token, method: "POST", body: {} });
  await api(`/loans/${secondNormalRequest.id}/issue`, { token, method: "POST", body: { dueDate } });
  console.log("PASS Check B: another ISSUED loan blocks issue, then stops blocking after return.");
} finally {
  await cleanup();
  await prisma.$disconnect();
  console.log("CLEANUP PASS: removed all regression test users, items, loans, and events.");
}
