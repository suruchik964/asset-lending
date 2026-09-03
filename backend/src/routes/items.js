import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All item routes require login
router.use(requireAuth);

// GET /api/items — default catalogue view (excludes archived unless ?includeArchived=true)
router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";

  const items = await prisma.item.findMany({
    where: includeArchived ? {} : { archived: false },
    include: {
      custodians: { include: { user: { select: { id: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(items);
});

// GET /api/items/mine — items where I'm a custodian (any librarian)
router.get("/mine", requireRole("LIBRARIAN"), async (req, res) => {
  const items = await prisma.item.findMany({
    where: { custodians: { some: { userId: req.user.userId } } },
    include: {
      custodians: { include: { user: { select: { id: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(items);
});

// GET /api/items/:id — item detail with full loan history
router.get("/:id", async (req, res) => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: {
      custodians: { include: { user: { select: { id: true, email: true } } } },
      loans: {
        include: { borrower: { select: { id: true, email: true } } },
        orderBy: { requestedAt: "desc" },
      },
    },
  });

  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(item);
});

// POST /api/items — librarian only
router.post("/", requireRole("LIBRARIAN"), async (req, res) => {
  const { title, category, code } = req.body;

  if (!title || !category || !code) {
    return res
      .status(400)
      .json({ error: "title, category and code are required" });
  }

  const existing = await prisma.item.findUnique({ where: { code } });
  if (existing) {
    return res
      .status(409)
      .json({ error: "An item with this code already exists" });
  }

  const item = await prisma.item.create({ data: { title, category, code } });
  res.status(201).json(item);
});

// PATCH /api/items/:id — librarian only, edit title/category/code
router.patch("/:id", requireRole("LIBRARIAN"), async (req, res) => {
  const { title, category, code } = req.body;
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(code !== undefined && { code }),
    },
  });

  res.json(updated);
});

// PATCH /api/items/:id/archive — librarian only
router.patch("/:id/archive", requireRole("LIBRARIAN"), async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data: { archived: true },
  });

  res.json(updated);
});

// PATCH /api/items/:id/restore — librarian only
router.patch("/:id/restore", requireRole("LIBRARIAN"), async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data: { archived: false },
  });

  res.json(updated);
});

// POST /api/items/:id/custodians — librarian only, assign a custodian
router.post("/:id/custodians", requireRole("LIBRARIAN"), async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "LIBRARIAN") {
    return res
      .status(400)
      .json({ error: "Custodian must be an existing librarian" });
  }

  const custodian = await prisma.custodian.upsert({
    where: { userId_itemId: { userId, itemId: item.id } },
    create: { userId, itemId: item.id },
    update: {},
  });

  res.status(201).json(custodian);
});

// DELETE /api/items/:id/custodians/:userId — librarian only, remove a custodian
router.delete(
  "/:id/custodians/:userId",
  requireRole("LIBRARIAN"),
  async (req, res) => {
    const { id, userId } = req.params;

    try {
      await prisma.custodian.delete({
        where: { userId_itemId: { userId, itemId: id } },
      });
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ error: "Custodian assignment not found" });
    }
  },
);

export default router;
