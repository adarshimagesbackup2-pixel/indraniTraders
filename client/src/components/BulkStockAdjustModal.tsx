import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bulkStockAddSchema, type BulkStockAddInput } from "@bardan/shared/validation/stock.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useBags } from "../hooks/useBags";
import { useBulkAddStock } from "../hooks/useStock";
import { showToast, extractApiErrorMessage } from "./ui/Toast";
import { Trash2 } from "lucide-react";

export function BulkStockAdjustModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: bags } = useBags();
  const bulkAddStock = useBulkAddStock();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BulkStockAddInput>({
    resolver: zodResolver(bulkStockAddSchema),
    defaultValues: { entries: [{ bagTypeId: "", entryType: "MANUFACTURING_ADDITION", quantityAdded: undefined, notes: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });

  const onSubmit = async (values: BulkStockAddInput) => {
    try {
      await bulkAddStock.mutateAsync(values);
      showToast.success(`Stock adjusted for ${values.entries.length} bag types`);
      reset({ entries: [{ bagTypeId: "", entryType: "MANUFACTURING_ADDITION", quantityAdded: undefined, notes: "" }] });
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not adjust stock"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Stock Adjustment" maxWidthClass="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-slate-400">Correct multiple bag types' stock counts in one go — useful after a physical stock-take.</p>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:grid-cols-12 sm:items-start">
              <div className="sm:col-span-4">
                <Controller
                  name={`entries.${index}.bagTypeId`}
                  control={control}
                  render={({ field: f }) => (
                    <select
                      {...f}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">Select bag type…</option>
                      {bags?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bagType} (current: {b.currentStock})
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div className="sm:col-span-3">
                <select
                  {...register(`entries.${index}.entryType`)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="MANUFACTURING_ADDITION">Manufacturing</option>
                  <option value="PURCHASE_ADDITION">Purchase</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  placeholder="Qty"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                  {...register(`entries.${index}.quantityAdded`)}
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  placeholder="Notes"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                  {...register(`entries.${index}.notes`)}
                />
              </div>
              <div className="flex justify-end sm:col-span-1">
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-danger hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ bagTypeId: "", entryType: "MANUFACTURING_ADDITION", quantityAdded: 0, notes: "" })}
        >
          + Add Another Bag Type
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Apply Adjustments
        </Button>
      </form>
    </Modal>
  );
}
