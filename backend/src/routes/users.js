import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("LIBRARIAN"), async (req, res) => {
  const where = req.query.role ? { role: req.query.role } : {};
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

export default router;
