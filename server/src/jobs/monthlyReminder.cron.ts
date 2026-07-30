import cron from "node-cron";
import { prisma } from "../prisma";
import { listReminderCandidates } from "../services/reminder.service";
import { formatIndianCurrency } from "../utils/currency";
import { logger } from "../utils/logger";

let scheduledTask: cron.ScheduledTask | null = null;
let lastRunDayOfMonth: number | null = null;

/**
 * Tier 1 automation (§11): runs every day at 9:00 AM server time, but only
 * *acts* on BusinessSettings.reminderDayOfMonth (checked dynamically since
 * settings can change). It does NOT send messages — that's impossible for
 * free without WhatsApp Business API — instead it computes the pending
 * list and logs a summary so staff sees "reminders ready" on the Reminders
 * page. A real deployment would push this to an admin notification channel
 * (email/push); here it's surfaced via the pending-balance count itself,
 * which the Reminders page already polls live.
 */
export function startMonthlyReminderCron() {
  scheduledTask = cron.schedule("0 9 * * *", async () => {
    try {
      const settings = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
      if (!settings) return;

      const today = new Date().getDate();
      if (today !== settings.reminderDayOfMonth) return;

      // Avoid re-running twice on the same day if the process restarts.
      if (lastRunDayOfMonth === today) return;
      lastRunDayOfMonth = today;

      const candidates = await listReminderCandidates("balance");
      const totalDue = candidates.reduce((sum, c) => sum + c.balance, 0);

      logger.info(
        `Monthly reminder prep: ${candidates.length} customers have outstanding balances totaling ${formatIndianCurrency(
          totalDue
        )}. Open Reminders to send WhatsApp messages.`
      );
    } catch (err) {
      logger.error("Monthly reminder cron failed", err);
    }
  });

  logger.info("Monthly reminder cron scheduled (checks daily at 9:00 AM server time)");
}

export function stopMonthlyReminderCron() {
  scheduledTask?.stop();
}
