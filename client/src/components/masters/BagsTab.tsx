import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bagCreateSchema, type BagCreateInput } from "@bardan/shared/validation/bag.schema";
import { useBags, useCreateBag, useUpdateBag, type Bag } from "../../hooks/useBags";
import { Table, type Column } from "../ui/Table";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

function BagFormModal({ isOpen, onClose, editing }: { isOpen: boolean; onClose: () => void; editing: Bag | null }) {
  const createBag = useCreateBag();
  const updateBag = useUpdateBag();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BagCreateInput>({
    resolver: zodResolver(bagCreateSchema),
    defaultValues: editing
      ? {
          bagType: editing.bagType,
          defaultRate: editing.defaultRate,
          currentStock: editing.currentStock,
          lowStockThreshold: editing.lowStockThreshold,
          hsnCode: editing.hsnCode ?? "6305",
          gstRate: editing.gstRate,
          unitOfMeasure: editing.unitOfMeasure,
        }
      : { bagType: "", defaultRate: undefined, currentStock: 0, lowStockThreshold: 2000, hsnCode: "6305", gstRate: 5, unitOfMeasure: "BAG" },
  });

  const onSubmit = async (values: BagCreateInput) => {
    try {
      if (editing) {
        await updateBag.mutateAsync({ id: editing.id, input: values });
        showToast.success("Bag type updated");
      } else {
        await createBag.mutateAsync(values);
        showToast.success("Bag type added");
      }
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not save bag type"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Bag Type" : "Add Bag Type"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Bag Type Name" error={errors.bagType?.message} {...register("bagType")} />
        <Input label="Default Rate (₹/bag)" type="number" step="0.01" error={errors.defaultRate?.message} {...register("defaultRate")} />
        {!editing && (
          <Input label="Initial Stock" type="number" error={errors.currentStock?.message} {...register("currentStock")} />
        )}
        {editing && <p className="text-xs text-slate-400">Stock is adjusted only via Add Stock on the Stock Register.</p>}
        <Input label="Low Stock Threshold" type="number" error={errors.lowStockThreshold?.message} {...register("lowStockThreshold")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="HSN Code" error={errors.hsnCode?.message} {...register("hsnCode")} />
          <Input label="GST Rate (%)" type="number" step="0.01" error={errors.gstRate?.message} {...register("gstRate")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Unit of Measure</label>
          <select
            {...register("unitOfMeasure")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="BAG">BAG</option>
            <option value="PCS">PCS</option>
            <option value="KG">KG</option>
            <option value="NOS">NOS</option>
          </select>
        </div>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {editing ? "Save Changes" : "Add Bag Type"}
        </Button>
      </form>
    </Modal>
  );
}

export function BagsTab() {
  const { data, isLoading, isError, refetch } = useBags();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bag | null>(null);

  const columns: Column<Bag>[] = [
    { header: "Bag Type", accessor: (b) => b.bagType },
    { header: "Rate", accessor: (b) => `₹${b.defaultRate}` },
    { header: "GST %", accessor: (b) => `${b.gstRate}%` },
    { header: "Unit", accessor: (b) => b.unitOfMeasure },
    { header: "Stock", accessor: (b) => b.currentStock },
    { header: "HSN", accessor: (b) => b.hsnCode },
    {
      header: "Actions",
      accessor: (b) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(b);
            setModalOpen(true);
          }}
          className="text-xs text-primary hover:underline"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Add Bag Type
        </Button>
      </div>
      <Table columns={columns} data={data} isLoading={isLoading} isError={isError} onRetry={refetch} rowKey={(b) => b.id} emptyMessage="No bag types yet" />
      <BagFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
