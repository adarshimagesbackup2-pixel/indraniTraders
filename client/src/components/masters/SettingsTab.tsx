import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsUpdateSchema, type SettingsUpdateInput } from "@bardan/shared/validation/settings.schema";
import { useSettings, useUpdateSettings, useRecalculateBalances } from "../../hooks/useSettings";
import { downloadFullBackup } from "../../hooks/useBackup";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ChangePasswordModal } from "../ChangePasswordModal";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

const REASON_LABELS: Record<string, string> = {
  SUPPLY: "Supply",
  EXPORT: "Export",
  JOB_WORK: "Job Work",
  SKD_CKD: "SKD/CKD",
  RECIPIENT_NOT_KNOWN: "Recipient Not Known",
  LINE_SALES: "Line Sales",
  SALES_RETURN: "Sales Return",
  EXHIBITION_FAIRS: "Exhibition/Fairs",
  FOR_OWN_USE: "For Own Use",
  OTHERS: "Others",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function SettingsTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const recalculate = useRecalculateBalances();
  const { user } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [backupFrom, setBackupFrom] = useState("");
  const [backupTo, setBackupTo] = useState("");
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsUpdateInput>({
    resolver: zodResolver(settingsUpdateSchema),
    values: settings
      ? {
          businessName: settings.businessName,
          businessGstin: settings.businessGstin ?? "",
          businessAddress: settings.businessAddress,
          businessPhone: settings.businessPhone,
          whatsappTemplate: settings.whatsappTemplate,
          gstEnabledDefault: settings.gstEnabledDefault,
          cgstPercent: settings.cgstPercent,
          sgstPercent: settings.sgstPercent,
          ewayThreshold: settings.ewayThreshold,
          reminderDayOfMonth: settings.reminderDayOfMonth,
          businessPincode: settings.businessPincode ?? "",
          businessStateCode: settings.businessStateCode ?? "",
          businessAddressLine1: settings.businessAddressLine1 ?? "",
          businessAddressLine2: settings.businessAddressLine2 ?? "",
          businessPlace: settings.businessPlace ?? "",
          turnoverAboveFiveCr: settings.turnoverAboveFiveCr,
          defaultTransportMode: settings.defaultTransportMode,
          defaultTransportationReason: settings.defaultTransportationReason as SettingsUpdateInput["defaultTransportationReason"],
          ewayThresholdIntrastate: settings.ewayThresholdIntrastate,
          ewayThresholdInterstate: settings.ewayThresholdInterstate,
          numberingMode: settings.numberingMode,
          financialYearStartMonth: settings.financialYearStartMonth,
        }
      : undefined,
  });

  if (isLoading || !settings) {
    return <div className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />;
  }

  const onSubmit = async (values: SettingsUpdateInput) => {
    try {
      await updateSettings.mutateAsync(values);
      showToast.success("Settings saved");
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not save settings"));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-3 text-sm font-semibold">Account</div>
        <Button variant="secondary" onClick={() => setChangePasswordOpen(true)}>
          Change Password
        </Button>
        <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={!isAdmin} className="space-y-4">
          <Card>
            <div className="mb-3 text-sm font-semibold">Business Details</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Business Name" error={errors.businessName?.message} {...register("businessName")} />
              <Input label="GSTIN (optional)" error={errors.businessGstin?.message} {...register("businessGstin")} />
              <Input label="Address" error={errors.businessAddress?.message} {...register("businessAddress")} />
              <Input label="Phone" error={errors.businessPhone?.message} {...register("businessPhone")} />
            </div>
          </Card>

          <Card>
            <div className="mb-1 text-sm font-semibold">E-Way Bill Defaults</div>
            <p className="mb-3 text-xs text-slate-400">
              These are your business's default e-way bill details. They auto-fill every order's JSON export but can
              still be overridden per-order if needed.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Address Line 1" error={errors.businessAddressLine1?.message} {...register("businessAddressLine1")} />
              <Input label="Address Line 2" error={errors.businessAddressLine2?.message} {...register("businessAddressLine2")} />
              <Input label="Place/City" error={errors.businessPlace?.message} {...register("businessPlace")} />
              <Input label="Pincode" error={errors.businessPincode?.message} {...register("businessPincode")} />
              <Input label="GST State Code (2-digit)" placeholder="e.g. 27" error={errors.businessStateCode?.message} {...register("businessStateCode")} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("turnoverAboveFiveCr")} />
              Turnover above ₹5 crore (requires 6-digit HSN codes instead of 4-digit)
            </label>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Default Transport Mode</label>
                <select
                  {...register("defaultTransportMode")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="ROAD">Road</option>
                  <option value="RAIL">Rail</option>
                  <option value="AIR">Air</option>
                  <option value="SHIP">Ship</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Default Transportation Reason</label>
                <select
                  {...register("defaultTransportationReason")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="E-Way Threshold — Intrastate (₹)"
                type="number"
                error={errors.ewayThresholdIntrastate?.message}
                {...register("ewayThresholdIntrastate")}
              />
              <Input
                label="E-Way Threshold — Interstate (₹)"
                type="number"
                error={errors.ewayThresholdInterstate?.message}
                {...register("ewayThresholdInterstate")}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-sm font-semibold">Bill Numbering</div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Numbering Mode</label>
              <select
                {...register("numberingMode")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="AUTO">Auto (staff can still override per-order)</option>
                <option value="MANUAL">Manual (staff must type a number every time)</option>
              </select>
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-sm font-semibold">Tax Rates (legacy flat rate — per-product GST now takes priority)</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="CGST %" type="number" step="0.01" error={errors.cgstPercent?.message} {...register("cgstPercent")} />
              <Input label="SGST %" type="number" step="0.01" error={errors.sgstPercent?.message} {...register("sgstPercent")} />
              <Input label="Legacy E-Way Threshold (₹)" type="number" error={errors.ewayThreshold?.message} {...register("ewayThreshold")} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("gstEnabledDefault")} />
              Enable GST by default on new orders
            </label>
          </Card>

          <Card>
            <div className="mb-3 text-sm font-semibold">Financial Year</div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Financial Year Start Month</label>
              <select
                {...register("financialYearStartMonth")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Indian businesses typically use April. This affects date-range filters across the app.</p>
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-sm font-semibold">Reminders</div>
            <Input
              label="Monthly Reminder Day (1–28)"
              type="number"
              error={errors.reminderDayOfMonth?.message}
              {...register("reminderDayOfMonth")}
            />
            <label className="mb-1 mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">WhatsApp Message Template</label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              {...register("whatsappTemplate")}
            />
            <p className="mt-1 text-xs text-slate-400">
              Available variables: {"{customer_name}"}, {"{current_date}"}, {"{balance_amount}"}, {"{business_name}"}
            </p>
          </Card>

          {isAdmin && (
            <Button type="submit" isLoading={isSubmitting}>
              Save Settings
            </Button>
          )}
        </fieldset>
      </form>

      <Card>
        <div className="mb-2 text-sm font-semibold">Maintenance</div>
        <p className="mb-3 text-xs text-slate-400">
          Recalculates every customer's running ledger balance from scratch. Use this if balances ever look
          inconsistent after a manual data fix.
        </p>
        <Button
          variant="secondary"
          isLoading={recalculate.isPending}
          onClick={async () => {
            const result = await recalculate.mutateAsync();
            showToast.success(`Recalculated balances for ${result.customersProcessed} customers`);
          }}
          disabled={!isAdmin}
        >
          Recalculate All Balances
        </Button>

        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="mb-3 text-xs text-slate-400">
            Downloads a full JSON export of all customers, orders, ledger, and stock data — an offline copy
            independent of hosting. Daily snapshots are also written automatically to the server backup folder.
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
                  showToast.success(
                    backupFrom || backupTo
                      ? "Range backup download started"
                      : "Full backup download started"
                  );
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
        </div>
      </Card>
    </div>
  );
}
