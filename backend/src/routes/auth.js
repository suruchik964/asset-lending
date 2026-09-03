import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "email, password and role are required" });
  }
  if (!["LIBRARIAN", "MEMBER"].includes(role)) {
    return res.status(400).json({ error: "role must be LIBRARIAN or MEMBER" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, role },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

export default router;
