require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const routes     = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  message:  { error: "Too many requests, please try again later" },
});
app.use("/api/", limiter);

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: "Too many login attempts, please try again later" },
});
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "TaskFlow API",
    version: "2.0.0",
    time:    new Date().toISOString(),
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/api", routes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       TaskFlow API Server v2.0         ║
╠════════════════════════════════════════╣
║  🚀 Running on  http://localhost:${PORT}  ║
║  🗄️  Database   PostgreSQL + Prisma    ║
║  🤖 AI          Gemini (Google)        ║
║  🌍 Env         ${(process.env.NODE_ENV||"development").padEnd(22)}║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
