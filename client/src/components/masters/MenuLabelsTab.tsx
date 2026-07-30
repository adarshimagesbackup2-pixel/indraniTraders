import { useEffect, useState } from "react";
import { useMenuLabels, useUpdateMenuLabels, DEFAULT_LABELS } from "../../hooks/useMenuLabels";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { showToast, extractApiErrorMessage } from "../ui/Toast";

export function MenuLabelsTab() {
  const { data: labels, isLoading } = useMenuLabels();
  const updateLabels = useUpdateMenuLabels();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (labels) {
      const next: Record<string, string> = {};
      for (const key of Object.keys(DEFAULT_LABELS)) {
        const existing = labels.find((l) => l.key === key);
        next[key] = existing?.customLabel ?? "";
      }
      setValues(next);
    }
  }, [labels]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />;
  }

  const onSave = async () => {
    try {
      await updateLabels.mutateAsync(
        Object.entries(values).map(([key, customLabel]) => ({ key, customLabel }))
      );
      showToast.success("Menu names updated");
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not save menu names"));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Rename any sidebar item — leave blank to use the default English name.
      </p>
      <div className="space-y-3">
        {Object.entries(DEFAULT_LABELS).map(([key, defaultLabel]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-sm text-slate-500">{defaultLabel}</span>
            <Input
              placeholder={defaultLabel}
              value={values[key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button onClick={onSave} isLoading={updateLabels.isPending}>
        Save Menu Names
      </Button>
    </div>
  );
}
