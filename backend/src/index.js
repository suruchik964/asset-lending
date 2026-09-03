import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import itemsRoutes from "./routes/items.js";
import loansRoutes from "./routes/loans.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/items", itemsRoutes);
app.use("/api/loans", loansRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
