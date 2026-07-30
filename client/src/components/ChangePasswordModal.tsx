import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@bardan/shared/validation/auth.schema";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { api } from "../lib/api";
import { showToast, extractApiErrorMessage } from "./ui/Toast";

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordInput) => {
    try {
      await api.post("/auth/change-password", values);
      showToast.success("Password changed successfully");
      reset();
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not change password"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Current Password" type="password" error={errors.oldPassword?.message} {...register("oldPassword")} />
        <Input label="New Password" type="password" error={errors.newPassword?.message} {...register("newPassword")} />
        <Input label="Confirm New Password" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Change Password
        </Button>
      </form>
    </Modal>
  );
}
