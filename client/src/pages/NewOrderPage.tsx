import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Printer } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderCreateSchema, type OrderCreateInput } from "@bardan/shared/validation/order.schema";
import { CustomerAutocomplete } from "../components/CustomerAutocomplete";
import { OrderLineItemRow } from "../components/OrderLineItemRow";
import { OrderSummaryCard } from "../components/OrderSummaryCard";
import { PrintableChallan } from "../components/PrintableChallan";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useBags } from "../hooks/useBags";
import { useTransports } from "../hooks/useTransports";
import { useCreateOrder, downloadEwayJson, type Order } from "../hooks/useOrders";
import { useSettings } from "../hooks/useSettings";
import { showToast, extractApiErrorMessage } from "../components/ui/Toast";
import { formatCurrency } from "../lib/format";

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

export function NewOrderPage() {
  const { data: bags } = useBags();
  const { data: transports } = useTransports();
  const { data: settings } = useSettings();
  const createOrder = useCreateOrder();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Partial<OrderCreateInput> } | null)?.prefill;
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [creditBlocked, setCreditBlocked] = useState<string | null>(null);
  const [blacklistBlocked, setBlacklistBlocked] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const printFn = () => window.print();
  const openWhatsApp = (order: Order) => {
    if (!order.customer.phone) return;
    const message = `Hello ${order.customer.name}, your invoice ${order.challanNo} for ₹${order.totalAmount.toFixed(2)} is ready. Thank you.`;
    const url = `https://wa.me/91${order.customer.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderCreateInput>({
    resolver: zodResolver(orderCreateSchema),
    defaultValues: {
      customerId: "",
      transportId: "",
      gstEnabled: settings?.gstEnabledDefault ?? false,
      items: [{ bagTypeId: "", quantity: 1, pricingType: "PER_BAG", ratePerBag: undefined }],
      overrideCreditLimit: false,
      overrideBlacklist: false,
      customChallanNo: "",
      customerBillNo: "",
      transportationReason: (settings?.defaultTransportationReason as OrderCreateInput["transportationReason"]) ?? "SUPPLY",
      transportMode: settings?.defaultTransportMode ?? "ROAD",
      transportDocNo: "",
      transportDocDate: "",
      transDistanceKm: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const gstEnabled = watch("gstEnabled");
  const transportMode = watch("transportMode");

  // §7.2 — apply "Repeat Last Order" prefill once, on mount
  useEffect(() => {
    if (prefill) {
      reset((current) => ({ ...current, ...prefill }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [customerCreditLimit, setCustomerCreditLimit] = useState(0);
  const [customerOutstanding, setCustomerOutstanding] = useState(0);
  const [selectedCustomerBlacklisted, setSelectedCustomerBlacklisted] = useState<{ blacklisted: boolean; reason: string | null }>({
    blacklisted: false,
    reason: null,
  });

  const bagMap = useMemo(() => new Map(bags?.map((b) => [b.id, b])), [bags]);

  const subtotal = watchedItems.reduce((sum, item) => {
    if (!item.bagTypeId) return sum;
    if (item.pricingType === "PER_BAG") {
      const rate = item.ratePerBag ?? bagMap.get(item.bagTypeId)?.defaultRate ?? 0;
      return sum + (item.quantity || 0) * rate;
    }
    return sum + (item.lumpsumAmount || 0);
  }, 0);

  // Approximate blended GST preview (actual calc is per-line-item server-side)
  const avgGstRate =
    watchedItems.length > 0
      ? watchedItems.reduce((sum, item) => sum + (bagMap.get(item.bagTypeId)?.gstRate ?? 0), 0) / watchedItems.length
      : 0;
  const totalGst = gstEnabled ? subtotal * (avgGstRate / 100) : 0;
  const cgstAmount = totalGst / 2;
  const sgstAmount = totalGst / 2;
  const totalAmount = Math.floor(subtotal + totalGst + 0.5);

  const projectedBalance = customerOutstanding + totalAmount;
  const creditWarning =
    customerCreditLimit > 0 && projectedBalance > customerCreditLimit
      ? `This order will exceed the credit limit (₹${customerCreditLimit.toFixed(2)}) by ₹${(
          projectedBalance - customerCreditLimit
        ).toFixed(2)}.`
      : null;

  const ewayLikely = gstEnabled
    ? totalAmount >= Math.min(settings?.ewayThresholdIntrastate ?? 100000, settings?.ewayThresholdInterstate ?? 50000)
    : false;

  const onSubmit = async (values: OrderCreateInput) => {
    setCreditBlocked(null);
    setBlacklistBlocked(null);
    try {
      const order = await createOrder.mutateAsync(values);
      setCreatedOrder(order);
      showToast.success(`Order ${order.challanNo} created successfully`);
      reset({
        customerId: "",
        transportId: "",
        gstEnabled: settings?.gstEnabledDefault ?? false,
        items: [{ bagTypeId: "", quantity: 1, pricingType: "PER_BAG", ratePerBag: undefined }],
        overrideCreditLimit: false,
        overrideBlacklist: false,
        customChallanNo: "",
        customerBillNo: "",
        transportationReason: (settings?.defaultTransportationReason as OrderCreateInput["transportationReason"]) ?? "SUPPLY",
        transportMode: settings?.defaultTransportMode ?? "ROAD",
        transportDocNo: "",
        transportDocDate: "",
        transDistanceKm: undefined,
      });
      setCustomerCreditLimit(0);
      setCustomerOutstanding(0);
      setSelectedCustomerBlacklisted({ blacklisted: false, reason: null });
    } catch (err) {
      const message = extractApiErrorMessage(err, "Could not create order");
      if (message.toLowerCase().includes("blacklisted")) {
        setBlacklistBlocked(message);
      } else if (message.toLowerCase().includes("credit limit")) {
        setCreditBlocked(message);
      } else {
        showToast.error(message);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold">New Order</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <CustomerAutocomplete
                value={field.value}
                onChange={(id, creditLimit, outstanding, isBlacklisted, blacklistReason) => {
                  field.onChange(id);
                  setCustomerCreditLimit(creditLimit);
                  setCustomerOutstanding(outstanding);
                  setSelectedCustomerBlacklisted({ blacklisted: !!isBlacklisted, reason: blacklistReason ?? null });
                }}
                error={errors.customerId?.message}
              />
            )}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle</label>
            <select
              {...register("transportId")}
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 ${
                errors.transportId ? "border-danger" : "border-slate-300 dark:border-slate-600"
              }`}
            >
              <option value="">Select vehicle…</option>
              {transports?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.vehicleNo} — {t.driverName}
                </option>
              ))}
            </select>
            {errors.transportId && <p className="mt-1 text-xs text-danger">{errors.transportId.message}</p>}
          </div>
        </div>

        {selectedCustomerBlacklisted.blacklisted && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-danger">
            ⚠ This customer is blacklisted: {selectedCustomerBlacklisted.reason}. Contact an admin to remove this status before creating new orders.
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" {...register("overrideBlacklist")} />
              Override blacklist and proceed anyway (Admin only)
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Custom Invoice No. (optional)" placeholder="Leave blank to auto-generate" {...register("customChallanNo")} />
          <Input label="Customer's Own Invoice No. (optional)" {...register("customerBillNo")} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("gstEnabled")} />
          Apply GST (per bag type's own rate)
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Bag Line Items</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ bagTypeId: "", quantity: 1, pricingType: "PER_BAG", ratePerBag: undefined })}
            >
              + Add Bag Type
            </Button>
          </div>
          {fields.map((field, index) => (
            <OrderLineItemRow
              key={field.id}
              index={index}
              control={control}
              errors={errors}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>

        {ewayLikely && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="text-sm font-semibold">E-Way Bill Transport Details (this order may require one)</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Transportation Reason</label>
                <select
                  {...register("transportationReason")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Transport Mode</label>
                <select
                  {...register("transportMode")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="ROAD">Road</option>
                  <option value="RAIL">Rail</option>
                  <option value="AIR">Air</option>
                  <option value="SHIP">Ship</option>
                </select>
              </div>
            </div>
            {transportMode !== "ROAD" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Transport Doc No." error={errors.transportDocNo?.message} {...register("transportDocNo")} />
                <Input label="Transport Doc Date" type="date" {...register("transportDocDate")} />
              </div>
            )}
            <Input label="Transport Distance (km)" type="number" {...register("transDistanceKm")} />
          </div>
        )}

        <OrderSummaryCard
          subtotal={subtotal}
          gstEnabled={gstEnabled}
          cgstAmount={cgstAmount}
          sgstAmount={sgstAmount}
          totalAmount={totalAmount}
          creditWarning={creditWarning}
        />

        {creditBlocked && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-danger">
            {creditBlocked}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" {...register("overrideCreditLimit")} />
              Override credit limit and proceed anyway (Admin only)
            </label>
          </div>
        )}

        {blacklistBlocked && !selectedCustomerBlacklisted.blacklisted && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-danger">{blacklistBlocked}</div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
          Create Order
        </Button>
      </form>

      {createdOrder && settings && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 no-print">
            <div className="text-sm font-semibold">
              Invoice {createdOrder.challanNo} — {formatCurrency(createdOrder.totalAmount)}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={printFn} className="gap-1">
                <Printer className="h-4 w-4" /> Print Invoice
              </Button>
              <Button variant="secondary" onClick={() => openWhatsApp(createdOrder)} className="gap-1">
                <MessageCircle className="h-4 w-4" /> Send WhatsApp
              </Button>
              {createdOrder.ewayBillStatus === "PENDING" && (
                <Button variant="secondary" onClick={() => downloadEwayJson(createdOrder.id, createdOrder.challanNo)}>
                  Export E-Way Bill JSON
                </Button>
              )}
            </div>
          </div>
          <PrintableChallan ref={printRef} order={createdOrder} business={settings} />
        </div>
      )}
    </div>
  );
}
