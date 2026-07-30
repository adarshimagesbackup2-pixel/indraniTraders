import { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "./Button";

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyMessage = "Nothing here yet",
  emptyAction,
  rowKey,
  onRowClick,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Something went wrong loading this data.</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Inbox className="h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {columns.map((col) => (
              <th key={col.header} className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 dark:border-slate-800 ${onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.header} className={`px-3 py-2 ${col.className ?? ""}`}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards */}
      <div className="space-y-2 md:hidden">
        {data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={`rounded-lg border border-slate-200 dark:border-slate-700 p-3 ${onRowClick ? "cursor-pointer" : ""}`}
          >
            {columns.map((col) => (
              <div key={col.header} className="flex justify-between gap-2 py-1 text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">{col.header}</span>
                <span className="text-right">{col.accessor(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
