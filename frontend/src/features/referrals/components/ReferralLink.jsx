import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "../../notifications/hooks/useToast.js";

export function ReferralLink({ code = "", link = "" }) {
  const toast = useToast();

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Failed to copy referral link.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/40 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Affiliate Code</p>
        <p className="mt-1 text-lg font-semibold text-white">{code || "-"}</p>
      </div>
      <div>
        <p className="mb-1 text-xs text-white/60">Shareable Referral Link</p>
        <div className="rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white/80 break-all">
          {link || "No referral link available"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={!link}
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={12} />
          Copy Link
        </button>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
          >
            <ExternalLink size={12} />
            Open Link
          </a>
        ) : null}
      </div>
    </div>
  );
}
