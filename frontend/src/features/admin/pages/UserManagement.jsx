import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { UserTable } from "../components/UserTable.jsx";
import { UserModal } from "../components/UserModal.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { getAdminUsers } from "../services/adminService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function UserManagement() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { rows: userRows } = await getAdminUsers({
        search: query,
        limit: 100,
        offset: 0,
      });
      setRows(userRows);
    } catch (error) {
      toast.error(error?.message || "Failed to load global users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const token = query.trim().toLowerCase();
    if (!token) return true;
    return (
      row.name.toLowerCase().includes(token) ||
      String(row.email || "").toLowerCase().includes(token) ||
      String(row.role || "").toLowerCase().includes(token)
    );
  }), [rows, query]);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">User Management</p>
            <p className="mt-1 text-xs text-white/55">
              Global users dataset with account footprint and P/L metrics.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search user..."
                className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-accent/50"
              />
            </div>
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </Card>
      <AdminSubnav />

      <UserTable rows={filteredRows} onSelectUser={setSelectedUser} />
      <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
