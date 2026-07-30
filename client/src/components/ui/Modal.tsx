import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidthClass = "max-w-lg" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4">
      <div
        className={`flex h-full w-full flex-col bg-white/95 dark:bg-slate-900/95 sm:h-auto sm:max-h-[90vh] sm:w-full sm:${maxWidthClass} sm:rounded-2xl shadow-2xl`}
      >
        {title ? (
          <div className="no-print flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/70 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="no-print flex justify-end border-b border-slate-200/70 dark:border-slate-700/70 px-5 py-4">
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
