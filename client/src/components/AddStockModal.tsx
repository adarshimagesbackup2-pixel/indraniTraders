import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockAddSchema, type StockAddInput } from "@bardan/shared/validation/stock.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useBags } from "../hooks/useBags";
import { useAddStock } from "../hooks/useStock";
import { showToast, extractApiErrorMessage } from "./ui/Toast";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBagTypeId?: string;
}

export function AddStockModal({ isOpen, onClose, defaultBagTypeId }: AddStockModalProps) {
  const { data: bags } = useBags();
  const addStock = useAddStock();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockAddInput>({
    resolver: zodResolver(stockAddSchema),
    defaultValues: {
      bagTypeId: defaultBagTypeId ?? "",
      entryType: "MANUFACTURING_ADDITION",
      quantityAdded: undefined,
      notes: "",
    },
  });

  const onSubmit = async (values: StockAddInput) => {
    try {
      await addStock.mutateAsync(values);
      showToast.success("Stock added");
      reset();
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not add stock"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Stock">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Bag Type</label>
          <select
            {...register("bagTypeId")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select bag type…</option>
            {bags?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bagType} (current: {b.currentStock})
              </option>
            ))}
          </select>
          {errors.bagTypeId && <p className="mt-1 text-xs text-danger">{errors.bagTypeId.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Entry Type</label>
          <select
            {...register("entryType")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="MANUFACTURING_ADDITION">Manufacturing Addition</option>
            <option value="PURCHASE_ADDITION">Purchase Addition</option>
          </select>
        </div>

        <Input label="Quantity Added" type="number" error={errors.quantityAdded?.message} {...register("quantityAdded")} />
        <Input label="Notes (optional)" error={errors.notes?.message} {...register("notes")} />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Add Stock
        </Button>
      </form>
    </Modal>
  );
}
