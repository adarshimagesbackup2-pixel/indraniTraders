import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomersTab } from "../components/masters/CustomersTab";
import { BagsTab } from "../components/masters/BagsTab";
import { TransportsTab } from "../components/masters/TransportsTab";
import { SettingsTab } from "../components/masters/SettingsTab";
import { MenuLabelsTab } from "../components/masters/MenuLabelsTab";
import { AuditLogTab } from "../components/masters/AuditLogTab";
import { BackupTab } from "../components/masters/BackupTab";
import { useAuth } from "../context/AuthContext";

const BASE_TABS = [
  { key: "customers", label: "Customers" },
  { key: "bags", label: "Bag Types" },
  { key: "transports", label: "Vehicles" },
  { key: "menuLabels", label: "Menu Names" },
  { key: "settings", label: "Settings" },
] as const;

const ADMIN_ONLY_TABS = [
  { key: "auditLog", label: "Audit Log" },
  { key: "backup", label: "Backup" },
] as const;

type TabKey = (typeof BASE_TABS)[number]["key"] | (typeof ADMIN_ONLY_TABS)[number]["key"];

export function MastersPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const tabs = isAdmin ? [...BASE_TABS, ...ADMIN_ONLY_TABS] : BASE_TABS;

  const initialTab = (searchParams.get("tab") as TabKey) ?? "customers";
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabs.some((t) => t.key === initialTab) ? initialTab : "customers"
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Masters</h1>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "customers" && <CustomersTab />}
      {activeTab === "bags" && <BagsTab />}
      {activeTab === "transports" && <TransportsTab />}
      {activeTab === "menuLabels" && <MenuLabelsTab />}
      {activeTab === "settings" && <SettingsTab />}
      {activeTab === "auditLog" && isAdmin && <AuditLogTab />}
      {activeTab === "backup" && isAdmin && <BackupTab />}
    </div>
  );
}
