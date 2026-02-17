import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../../shared/components/ui/misc/Empty.jsx";
import { formatMoney, getAccountTypeLabel } from "./adminUtils.js";

export function AccountControlsPanel({
  accounts = [],
  activeAccount = null,
  onSwitchAccount,
  switching = false,
}) {
  return (
    <Card className="xl:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">Account Controls</p>
        <p className="text-xs text-white/50">
          Active: {activeAccount?.deriv_account_id || activeAccount?.id || "N/A"}
        </p>
      </div>

      {!accounts.length ? (
        <Empty message="No linked accounts found." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-white/50">
              <tr className="border-b border-white/10">
                <th className="pb-2 pr-3 font-medium">Account</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Currency</th>
                <th className="pb-2 pr-3 font-medium">Balance</th>
                <th className="pb-2 pr-3 font-medium">Default</th>
                <th className="pb-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {accounts.map((account) => {
                const isActive = Number(activeAccount?.id) === Number(account.id);
                return (
                  <tr key={account.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">{account.deriv_account_id || account.id}</td>
                    <td className="py-2 pr-3">{getAccountTypeLabel(account.account_type)}</td>
                    <td className="py-2 pr-3">{account.currency || "-"}</td>
                    <td className="py-2 pr-3">
                      {formatMoney(account.balance, account.currency || "USD")}
                    </td>
                    <td className="py-2 pr-3">
                      {account.is_default ? (
                        <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">
                          Yes
                        </span>
                      ) : (
                        <span className="text-white/40">No</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        disabled={switching || isActive}
                        onClick={() => onSwitchAccount?.(account.id)}
                        className="rounded border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isActive ? "Active" : "Set Active"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

