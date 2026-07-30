import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, blacklistToggleSchema, type CustomerInput, type BlacklistToggleInput } from "@bardan/shared/validation/customer.schema";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useSetBlacklist,
  type Customer,
} from "../../hooks/useCustomers";
import { useAuth } from "../../context/AuthContext";
import { Table, type Column } from "../ui/Table";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { formatCurrency } from "../../lib/format";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

function CustomerFormModal({ isOpen, onClose, editing }: { isOpen: boolean; onClose: () => void; editing: Customer | null }) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          phone: editing.phone,
          address: editing.address,
          gstin: editing.gstin ?? "",
          creditLimit: editing.creditLimit,
          trademarkName: editing.trademarkName ?? "",
          openingBalance: editing.openingBalance ?? 0,
          openingBalanceType: editing.openingBalanceType ?? "DEBIT",
          stateCode: editing.stateCode ?? "",
          pincode: editing.pincode ?? "",
          shipToAddress: editing.shipToAddress ?? "",
          shipToGstin: editing.shipToGstin ?? "",
          shipToPincode: editing.shipToPincode ?? "",
          shipToStateCode: editing.shipToStateCode ?? "",
        }
      : { name: "", phone: "", address: "", gstin: "", creditLimit: 0, trademarkName: "", openingBalance: 0, openingBalanceType: "DEBIT", stateCode: "", pincode: "" },
  });

  const onSubmit = async (values: CustomerInput) => {
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, input: values });
        showToast.success("Customer updated");
      } else {
        await createCustomer.mutateAsync(values);
        showToast.success("Customer added");
      }
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not save customer"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Customer" : "Add Customer"} maxWidthClass="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
        </div>
        <Input label="Address" error={errors.address?.message} {...register("address")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Trademark Name (optional)" placeholder="e.g. Indrani Traders" error={errors.trademarkName?.message} {...register("trademarkName")} />
          <Input label="GSTIN (optional)" error={errors.gstin?.message} {...register("gstin")} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Opening Balance (₹)" type="number" min="0" error={errors.openingBalance?.message} {...register("openingBalance")} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Opening Balance Type</label>
            <select
              {...register("openingBalanceType")}
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/90"
            >
              <option value="DEBIT">Bill Amount / Debit</option>
              <option value="CREDIT">Payment Received / Credit</option>
            </select>
          </div>
          <Input label="GST State Code (2-digit)" placeholder="e.g. 27" error={errors.stateCode?.message} {...register("stateCode")} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Pincode" placeholder="6-digit" error={errors.pincode?.message} {...register("pincode")} />
          <Input
            label="Credit Limit (₹, 0 = unlimited)"
            type="number"
            disabled={!isAdmin}
            error={errors.creditLimit?.message}
            {...register("creditLimit")}
          />
        </div>
        {!isAdmin && <p className="text-xs text-slate-400">Only an ADMIN can change the credit limit.</p>}

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-500">Ship-To Details (optional — leave blank if same as billing)</div>
          <div className="space-y-3">
            <Input label="Ship-To Address" error={errors.shipToAddress?.message} {...register("shipToAddress")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="Ship-To GSTIN" error={errors.shipToGstin?.message} {...register("shipToGstin")} />
              <Input label="Ship-To State Code" error={errors.shipToStateCode?.message} {...register("shipToStateCode")} />
              <Input label="Ship-To Pincode" error={errors.shipToPincode?.message} {...register("shipToPincode")} />
            </div>
          </div>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {editing ? "Save Changes" : "Add Customer"}
        </Button>
      </form>
    </Modal>
  );
}

function BlacklistModal({ isOpen, onClose, customer }: { isOpen: boolean; onClose: () => void; customer: Customer | null }) {
  const setBlacklist = useSetBlacklist();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BlacklistToggleInput>({
    resolver: zodResolver(blacklistToggleSchema),
    defaultValues: { isBlacklisted: !customer?.isBlacklisted, blacklistReason: "" },
  });

  useEffect(() => {
    if (customer) {
      reset({ isBlacklisted: !customer.isBlacklisted, blacklistReason: "" });
    }
  }, [customer, reset]);

  const isActionBlacklisting = !customer?.isBlacklisted;

  const onSubmit = async (values: BlacklistToggleInput) => {
    if (!customer) return;
    try {
      const payload: BlacklistToggleInput = {
        isBlacklisted: isActionBlacklisting,
        blacklistReason: isActionBlacklisting ? values.blacklistReason : undefined,
      };
      await setBlacklist.mutateAsync({ id: customer.id, input: payload });
      showToast.success(isActionBlacklisting ? "Customer blacklisted" : "Customer removed from blacklist");
      onClose();
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not update blacklist status"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customer?.isBlacklisted ? "Remove from Blacklist" : "Blacklist Customer"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {customer?.isBlacklisted
            ? `Remove ${customer?.name} from the blacklist? They'll be able to receive new orders again.`
            : `Blacklisting ${customer?.name} will block new orders for them until an admin removes this status.`}
        </p>
        {isActionBlacklisting && (
          <Input label="Reason (required)" error={errors.blacklistReason?.message} {...register("blacklistReason")} />
        )}
        <Button type="submit" variant={customer?.isBlacklisted ? "secondary" : "danger"} isLoading={isSubmitting} className="w-full">
          {customer?.isBlacklisted ? "Remove from Blacklist" : "Blacklist Customer"}
        </Button>
      </form>
    </Modal>
  );
}

export function CustomersTab() {
  const [search, setSearch] = useState("");
  const [blacklistedOnly, setBlacklistedOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [blacklistModalCustomer, setBlacklistModalCustomer] = useState<Customer | null>(null);
  const { data, isLoading, isError, refetch } = useCustomers(search, blacklistedOnly);
  const deleteCustomer = useDeleteCustomer();
  const { user } = useAuth();

  const columns: Column<Customer>[] = [
    {
      header: "Name",
      accessor: (c) => (
        <div className="flex items-center gap-2">
          {c.name}
          {c.isBlacklisted && <Badge color="red">⚠ Blacklisted</Badge>}
        </div>
      ),
    },
    { header: "Phone", accessor: (c) => c.phone },
    { header: "Trademark", accessor: (c) => c.trademarkName ?? "—" },
    { header: "State Code", accessor: (c) => c.stateCode ?? <span className="text-danger">Missing</span> },
    { header: "Credit Limit", accessor: (c) => (c.creditLimit > 0 ? formatCurrency(c.creditLimit) : "Unlimited") },
    {
      header: "Actions",
      accessor: (c) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(c);
              setModalOpen(true);
            }}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
          {user?.role === "ADMIN" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBlacklistModalCustomer(c);
                }}
                className="text-xs text-warning hover:underline"
              >
                {c.isBlacklisted ? "Un-blacklist" : "Blacklist"}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await deleteCustomer.mutateAsync(c.id);
                    showToast.success("Customer removed");
                  } catch (err) {
                    showToast.error(extractApiErrorMessage(err));
                  }
                }}
                className="text-xs text-danger hover:underline"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={blacklistedOnly} onChange={(e) => setBlacklistedOnly(e.target.checked)} />
            Show blacklisted only
          </label>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Add Customer
        </Button>
      </div>
      <Table columns={columns} data={data} isLoading={isLoading} isError={isError} onRetry={refetch} rowKey={(c) => c.id} emptyMessage="No customers yet" />
      <CustomerFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <BlacklistModal isOpen={!!blacklistModalCustomer} onClose={() => setBlacklistModalCustomer(null)} customer={blacklistModalCustomer} />
    </div>
  );
}
