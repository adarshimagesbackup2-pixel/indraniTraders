import { Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { BagTypeSelect } from "./BagTypeSelect";

interface OrderLineItemRowProps {
  index: number;
  control: any;
  errors: any;
  onRemove: () => void;
  canRemove: boolean;
}

export function OrderLineItemRow({ index, control, errors, onRemove, canRemove }: OrderLineItemRowProps) {
  const itemErrors = errors?.items?.[index];

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:grid-cols-12 sm:items-start">
      <div className="sm:col-span-4">
        <Controller
          name={`items.${index}.bagTypeId`}
          control={control}
          render={({ field }) => (
            <BagTypeSelect value={field.value} onChange={field.onChange} error={itemErrors?.bagTypeId?.message} />
          )}
        />
      </div>

      <div className="sm:col-span-2">
        <Controller
          name={`items.${index}.quantity`}
          control={control}
          render={({ field }) => (
            <input
              type="number"
              min={1}
              placeholder="Qty"
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 ${
                itemErrors?.quantity ? "border-danger" : "border-slate-300 dark:border-slate-600"
              }`}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
            />
          )}
        />
        {itemErrors?.quantity && <p className="mt-1 text-xs text-danger">{itemErrors.quantity.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <Controller
          name={`items.${index}.pricingType`}
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="PER_BAG">Per Bag</option>
              <option value="LUMPSUM">Lump-sum</option>
            </select>
          )}
        />
      </div>

      <div className="sm:col-span-3">
        <Controller
          name={`items.${index}.pricingType`}
          control={control}
          render={({ field: pricingField }) =>
            pricingField.value === "PER_BAG" ? (
              <Controller
                name={`items.${index}.ratePerBag`}
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate/bag"
                    className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 ${
                      itemErrors?.ratePerBag ? "border-danger" : "border-slate-300 dark:border-slate-600"
                    }`}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            ) : (
              <Controller
                name={`items.${index}.lumpsumAmount`}
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Total ₹"
                    className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 ${
                      itemErrors?.lumpsumAmount ? "border-danger" : "border-slate-300 dark:border-slate-600"
                    }`}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            )
          }
        />
      </div>

      <div className="flex justify-end sm:col-span-1">
        {canRemove && (
          <button type="button" onClick={onRemove} className="rounded-lg p-2 text-danger hover:bg-red-50 dark:hover:bg-red-900/30">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
