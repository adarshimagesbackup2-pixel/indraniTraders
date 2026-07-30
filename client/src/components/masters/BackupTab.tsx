import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { downloadFullBackup } from "../../hooks/useBackup";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

export function BackupTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [backupFrom, setBackupFrom] = useState("");
  const [backupTo, setBackupTo] = useState("");
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 text-sm font-semibold">Backup & Export</div>
        <p className="mb-3 text-xs text-slate-400">
          Download a JSON backup of your business data. Daily snapshots are also written automatically on the server.
        </p>
        {!isAdmin && (
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
            Only admin users can download backups.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="mb-1 block">From date (optional)</span>
            <input
              type="date"
              value={backupFrom}
              onChange={(e) => setBackupFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              disabled={!isAdmin}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="mb-1 block">To date (optional)</span>
            <input
              type="date"
              value={backupTo}
              onChange={(e) => setBackupTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              disabled={!isAdmin}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            isLoading={isDownloadingBackup}
            disabled={!isAdmin}
            onClick={async () => {
              try {
                setIsDownloadingBackup(true);
                await downloadFullBackup({ from: backupFrom || undefined, to: backupTo || undefined });
                showToast.success(backupFrom || backupTo ? "Range backup download started" : "Full backup download started");
              } catch (err) {
                showToast.error(extractApiErrorMessage(err, "Could not download backup"));
              } finally {
                setIsDownloadingBackup(false);
              }
            }}
          >
            {backupFrom || backupTo ? "Download Date Range Backup" : "Download Full Backup"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setBackupFrom("");
              setBackupTo("");
            }}
            disabled={!isAdmin}
          >
            Clear Dates
          </Button>
        </div>
      </Card>
    </div>
  );
}
