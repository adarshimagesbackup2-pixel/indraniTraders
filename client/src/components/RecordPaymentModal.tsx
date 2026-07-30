import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentCreateSchema, type PaymentCreateInput } from "@bardan/shared/validation/payment.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useRecordPayment } from "../hooks/useKhata";
import { showToast, extractApiErrorMessage } from "./ui/Toast";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

export function RecordPaymentModal({ isOpen, onClose, customerId }: RecordPaymentModalProps) {
  const recordPayment = useRecordPayment();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentCreateInput>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      customerId,
      amount: undefined,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: "CASH",
      referenceNo: "",
      notes: "",
    },
  });

  const paymentMode = watch("paymentMode");

  const onSubmit = async (values: PaymentCreateInput) => {
    try {
      await recordPayment.mutateAsync({ ...values, customerId });
      showToast.success("Payment recorded");
      reset();
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not record payment"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Amount (₹)" type="number" step="0.01" error={errors.amount?.message} {...register("amount")} />
        <Input label="Payment Date" type="date" error={errors.paymentDate?.message} {...register("paymentDate")} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Mode</label>
          <select
            {...register("paymentMode")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
        {paymentMode !== "CASH" && (
          <Input label="Reference ID" error={errors.referenceNo?.message} {...register("referenceNo")} />
        )}
        <Input label="Notes (optional)" error={errors.notes?.message} {...register("notes")} />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Record Payment
        </Button>
      </form>
    </Modal>
  );
}
