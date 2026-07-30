import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transportSchema, type TransportInput } from "@bardan/shared/validation/transport.schema";
import { useTransports, useCreateTransport, useUpdateTransport, type Transport } from "../../hooks/useTransports";
import { Table, type Column } from "../ui/Table";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

function TransportFormModal({
  isOpen,
  onClose,
  editing,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Transport | null;
}) {
  const createTransport = useCreateTransport();
  const updateTransport = useUpdateTransport();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransportInput>({
    resolver: zodResolver(transportSchema),
    defaultValues: editing
      ? { vehicleNo: editing.vehicleNo, driverName: editing.driverName, driverPhone: editing.driverPhone }
      : { vehicleNo: "", driverName: "", driverPhone: "" },
  });

  const onSubmit = async (values: TransportInput) => {
    try {
      if (editing) {
        await updateTransport.mutateAsync({ id: editing.id, input: values });
        showToast.success("Vehicle updated");
      } else {
        await createTransport.mutateAsync(values);
        showToast.success("Vehicle added");
      }
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not save vehicle"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Vehicle" : "Add Vehicle"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Vehicle Number" error={errors.vehicleNo?.message} {...register("vehicleNo")} />
        <Input label="Driver Name" error={errors.driverName?.message} {...register("driverName")} />
        <Input label="Driver Phone" error={errors.driverPhone?.message} {...register("driverPhone")} />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {editing ? "Save Changes" : "Add Vehicle"}
        </Button>
      </form>
    </Modal>
  );
}

export function TransportsTab() {
  const { data, isLoading, isError, refetch } = useTransports();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);

  const columns: Column<Transport>[] = [
    { header: "Vehicle No.", accessor: (t) => t.vehicleNo },
    { header: "Driver", accessor: (t) => t.driverName },
    { header: "Phone", accessor: (t) => t.driverPhone },
    {
      header: "Actions",
      accessor: (t) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(t);
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
          + Add Vehicle
        </Button>
      </div>
      <Table columns={columns} data={data} isLoading={isLoading} isError={isError} onRetry={refetch} rowKey={(t) => t.id} emptyMessage="No vehicles yet" />
      <TransportFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
