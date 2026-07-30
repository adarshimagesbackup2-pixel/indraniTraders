import cron from "node-cron";
import fs from "node:fs/promises";
import path from "node:path";
import { exportFullBackup } from "../services/backup.service";
import { logger } from "../utils/logger";

let dailyBackupTask: cron.ScheduledTask | null = null;
let lastBackupDate: string | null = null;

function getBackupDirectory() {
  return path.resolve(__dirname, "../../backups");
}

export async function writeEmergencyBackupSnapshot() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const backupDirectory = getBackupDirectory();
  await fs.mkdir(backupDirectory, { recursive: true });

  const backup = await exportFullBackup();
  const fileName = `bardan-erp-emergency-backup-${todayKey}.json`;
  const filePath = path.join(backupDirectory, fileName);

  await fs.writeFile(
    filePath,
    JSON.stringify(backup, (_key, value) => (value?.constructor?.name === "Decimal" ? Number(value) : value), 2),
    "utf8"
  );

  lastBackupDate = todayKey;
  logger.info(`Emergency backup snapshot written to ${filePath}`);
}

async function writeDailyBackupSnapshot() {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (lastBackupDate === todayKey) {
    return;
  }

  const backupDirectory = getBackupDirectory();
  await fs.mkdir(backupDirectory, { recursive: true });

  const backup = await exportFullBackup();
  const fileName = `bardan-erp-backup-${todayKey}.json`;
  const filePath = path.join(backupDirectory, fileName);

  await fs.writeFile(
    filePath,
    JSON.stringify(backup, (_key, value) => (value?.constructor?.name === "Decimal" ? Number(value) : value), 2),
    "utf8"
  );

  lastBackupDate = todayKey;
  logger.info(`Daily backup snapshot written to ${filePath}`);
}

export function startDailyBackupCron() {
  if (dailyBackupTask) return;

  void writeDailyBackupSnapshot().catch((err) => {
    logger.error("Initial daily backup run failed", err);
  });

  dailyBackupTask = cron.schedule("0 0 * * *", async () => {
    try {
      await writeDailyBackupSnapshot();
    } catch (err) {
      logger.error("Daily backup cron failed", err);
    }
  });

  logger.info("Daily backup cron scheduled (runs immediately on startup and at midnight server time)");
}

export function stopDailyBackupCron() {
  dailyBackupTask?.stop();
  dailyBackupTask = null;
}
