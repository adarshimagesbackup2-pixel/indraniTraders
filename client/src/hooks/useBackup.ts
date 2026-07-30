import { api } from "../lib/api";

export interface BackupDownloadOptions {
  from?: string;
  to?: string;
}

export async function downloadFullBackup(options: BackupDownloadOptions = {}) {
  const response = await api.get("/backup/export", { params: options, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const suffix = options.from || options.to ? `-${[options.from ?? "all", options.to ?? "all"].join("-to-")}` : "";
  link.setAttribute("download", `bardan-erp-backup-${dateStamp}${suffix}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
