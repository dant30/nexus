import React from "react";
import { X } from "lucide-react";

const levelStyles = {
  info: "border-sky-400/40 bg-sky-400/10 text-sky-100",
  success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  error: "border-rose-400/40 bg-rose-400/10 text-rose-100",
};

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone = levelStyles[toast.level] || levelStyles.info;

  return (
    <div className={`w-80 rounded-lg border p-3 shadow-md backdrop-blur ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {toast.title ? <p className="text-xs font-semibold">{toast.title}</p> : null}
          <p className="text-xs">{toast.message}</p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
          onClick={() => onClose?.(toast.id)}
          aria-label="Close toast"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
