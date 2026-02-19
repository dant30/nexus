import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { UserTable } from "../components/UserTable.jsx";
import { UserModal } from "../components/UserModal.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { buildUserRows } from "../services/adminService.js";

export function UserManagement() {
  const { user } = useAuth();
  const { accounts = [] } = useAccountContext() || {};
  const { trades = [] } = useTradingContext();
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const rows = useMemo(() => buildUserRows({ user, accounts, trades }), [user, accounts, trades]);
  const filteredRows = rows.filter((row) => {
    const token = query.trim().toLowerCase();
    if (!token) return true;
    return (
      row.name.toLowerCase().includes(token) ||
      String(row.email || "").toLowerCase().includes(token) ||
      String(row.role || "").toLowerCase().includes(token)
    );
  });

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">User Management</p>
            <p className="mt-1 text-xs text-white/55">
              Admin visibility for users, account footprint, and trading outcomes.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search user..."
              className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-accent/50"
            />
          </div>
        </div>
      </Card>
      <AdminSubnav />

      <UserTable rows={filteredRows} onSelectUser={setSelectedUser} />
      <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
