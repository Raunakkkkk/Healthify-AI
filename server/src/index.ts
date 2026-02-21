import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v2 as cloudinary } from "cloudinary";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import goalRoutes from "./routes/goals.js";
import entryRoutes from "./routes/entries.js";
import reportRoutes from "./routes/reports.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Security & parsing
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later" },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "AI rate limit reached, please wait a moment" },
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
