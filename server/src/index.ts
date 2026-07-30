import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { startMonthlyReminderCron } from "./jobs/monthlyReminder.cron";
import { startDailyBackupCron } from "./jobs/dailyBackup.cron";
import { logger } from "./utils/logger";
import { writeEmergencyBackupSnapshot } from "./jobs/dailyBackup.cron";

import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";
import bagRoutes from "./routes/bag.routes";
import transportRoutes from "./routes/transport.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import khataRoutes from "./routes/khata.routes";
import stockRoutes from "./routes/stock.routes";
import reminderRoutes from "./routes/reminder.routes";
import reportsRoutes from "./routes/reports.routes";
import settingsRoutes from "./routes/settings.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import menuLabelRoutes from "./routes/menuLabel.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import backupRoutes from "./routes/backup.routes";

const app = express();
const PORT = process.env.PORT ?? 4000;

// §13 Security checklist
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Basic trim/control-character sanitization on all string body fields (§13).
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      const value = req.body[key];
      if (typeof value === "string") {
        // eslint-disable-next-line no-control-regex
        req.body[key] = value.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
      }
    }
  }
  next();
});

app.get("/api/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/bags", bagRoutes);
app.use("/api/transports", transportRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/khata", khataRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/menu-labels", menuLabelRoutes);
app.use("/api/audit-log", auditLogRoutes);
app.use("/api/backup", backupRoutes);

// Unknown /api/* routes → JSON 404 (must come after all real API routes,
// before the error handler and the SPA static/catch-all below).
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: { message: "Not found" } });
});

app.use(errorHandler);

// Serve the built React app (client/dist) so the whole product is one
// Render web service — no separate static site / CORS setup needed.
const clientDistPath = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const server = app.listen(Number(PORT), "0.0.0.0", () => {
  logger.info(`Bardan ERP server listening on port ${PORT}`);
  startMonthlyReminderCron();
  startDailyBackupCron();
  void writeEmergencyBackupSnapshot().catch((err) => {
    logger.error("Initial emergency backup failed", err);
  });
});

const shutdown = async () => {
  logger.info("Shutting down server, writing emergency backup snapshot...");
  try {
    await writeEmergencyBackupSnapshot();
  } catch (err) {
    logger.error("Emergency backup on shutdown failed", err);
  }
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
process.on("uncaughtException", async (err) => {
  logger.error("Unhandled exception, writing emergency backup", err);
  try {
    await writeEmergencyBackupSnapshot();
  } catch (backupErr) {
    logger.error("Emergency backup after uncaught exception failed", backupErr);
  }
  process.exit(1);
});
process.on("unhandledRejection", async (reason) => {
  logger.error("Unhandled rejection, writing emergency backup", reason);
  try {
    await writeEmergencyBackupSnapshot();
  } catch (backupErr) {
    logger.error("Emergency backup after unhandled rejection failed", backupErr);
  }
  process.exit(1);
});
