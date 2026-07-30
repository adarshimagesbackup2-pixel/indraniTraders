import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderEditSchema, type OrderEditInput } from "@bardan/shared/validation/order.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { OrderLineItemRow } from "./OrderLineItemRow";
import { useTransports } from "../hooks/useTransports";
import { useEditOrder, type Order } from "../hooks/useOrders";
import { showToast, extractApiErrorMessage } from "./ui/Toast";

export function OrderEditModal({ isOpen, onClose, order }: { isOpen: boolean; onClose: () => void; order: Order | null }) {
  const { data: transports } = useTransports();
  const editOrder = useEditOrder();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrderEditInput>({
    resolver: zodResolver(orderEditSchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const transportMode = watch("transportMode");

  useEffect(() => {
    if (order) {
      reset({
        customerId: order.customerId,
        transportId: order.transportId,
        gstEnabled: order.gstEnabled,
        items: order.items.map((i) => ({
          bagTypeId: i.bagTypeId,
          quantity: i.quantity,
          pricingType: i.pricingType,
          ratePerBag: i.ratePerBag ?? undefined,
          lumpsumAmount: i.pricingType === "LUMPSUM" ? i.lineTotal : undefined,
        })),
        customerBillNo: order.customerBillNo ?? "",
        transportationReason: order.transportationReason as OrderEditInput["transportationReason"],
        transportMode: order.transportMode,
        transportDocNo: order.transportDocNo ?? "",
        transportDocDate: order.transportDocDate?.slice(0, 10) ?? "",
        transDistanceKm: order.transDistanceKm ?? undefined,
        editReason: "",
      });
    }
  }, [order, reset]);

  const onSubmit = async (values: OrderEditInput) => {
    if (!order) return;
    try {
      await editOrder.mutateAsync({ orderId: order.id, input: values });
      showToast.success(`Invoice ${order.challanNo} updated`);
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not edit order"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Invoice ${order?.challanNo ?? ""}`} maxWidthClass="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-slate-400">
          This reverses the original stock/ledger effect and re-applies the corrected version, preserving a full audit
          trail. Blocked if the order already has a GENERATED e-Way Bill.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle</label>
          <select
            {...register("transportId")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            {transports?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.vehicleNo} — {t.driverName}
              </option>
            ))}
          </select>
        </div>

        <Input label="Customer's Own Invoice No. (optional)" {...register("customerBillNo")} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("gstEnabled")} />
          Apply GST
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Bag Line Items</h3>
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

        {transportMode !== "ROAD" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Transport Doc No." error={errors.transportDocNo?.message} {...register("transportDocNo")} />
            <Input label="Transport Doc Date" type="date" {...register("transportDocDate")} />
          </div>
        )}

        <Input label="Reason for this edit (required)" error={errors.editReason?.message} {...register("editReason")} />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Save Corrected Order
        </Button>
      </form>
    </Modal>
  );
}
