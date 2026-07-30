import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@bardan/shared/validation/auth.schema";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { extractApiErrorMessage } from "../components/ui/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values.phone, values.password, values.rememberMe);
      navigate("/");
    } catch (err) {
      setServerError(extractApiErrorMessage(err, "Invalid phone number or password"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-primary">Indrani Traders</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Onion Bag Manufacturing &amp; Trading</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Phone Number"
            placeholder="10-digit phone number"
            inputMode="numeric"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Password"
            error={errors.password?.message}
            {...register("password")}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" {...register("rememberMe")} />
            Remember me for 90 days
          </label>

          {serverError && <p className="text-sm text-danger">{serverError}</p>}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Log In
          </Button>
        </form>
      </div>
    </div>
  );
}
