import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderCancelSchema, type OrderCancelInput } from "@bardan/shared/validation/order.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useCancelOrder, type Order } from "../hooks/useOrders";
import { showToast, extractApiErrorMessage } from "./ui/Toast";

export function OrderCancelModal({ isOpen, onClose, order }: { isOpen: boolean; onClose: () => void; order: Order | null }) {
  const cancelOrder = useCancelOrder();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderCancelInput>({ resolver: zodResolver(orderCancelSchema) });

  const onSubmit = async (values: OrderCancelInput) => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync({ orderId: order.id, cancelReason: values.cancelReason });
      showToast.success(`Invoice ${order.challanNo} cancelled`);
      reset();
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not cancel order"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cancel Invoice ${order?.challanNo ?? ""}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This reverses the stock deduction and ledger debit for this order, and marks it Cancelled. This cannot be
          undone — the order stays visible in history with its cancellation reason.
        </p>
        <Input label="Reason for cancelling" error={errors.cancelReason?.message} {...register("cancelReason")} />
        <Button type="submit" variant="danger" isLoading={isSubmitting} className="w-full">
          Cancel This Order
        </Button>
      </form>
    </Modal>
  );
}
