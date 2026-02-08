/**
 * Dashboard Page
 * Displays accounts, open trades, balance, and trading statistics
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";
import { useQuery } from "../hooks/useApi.js";
import { useWebSocket } from "../providers/WSProvider.jsx";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected: wsConnected } = useWebSocket();

  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Fetch accounts
  const { data: accounts, loading: accountsLoading } = useQuery("/accounts", {
    refetchInterval: 10000,
  });

  // Fetch open trades
  const { data: openTrades, loading: tradesLoading } = useQuery("/trades/open", {
    refetchInterval: 5000,
  });

  // Fetch balance (cached)
  const { data: balance } = useQuery("/accounts/balance", {
    refetchInterval: 5000,
  });

  // Get primary account for display
  const primaryAccount = accounts?.[0];

  // Calculate stats
  const winCount = openTrades?.filter((t) => t.status === "WON").length || 0;
  const lossCount = openTrades?.filter((t) => t.status === "LOST").length || 0;
  const winRate =
    openTrades?.length > 0
      ? ((winCount / openTrades.length) * 100).toFixed(1)
      : 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">Nexus</h1>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  wsConnected
                    ? "bg-green-600/20 text-green-300"
                    : "bg-yellow-600/20 text-yellow-300"
                }`}
              >
                {wsConnected ? "Connected" : "Connecting..."}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-300">{user?.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Balance Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">
              Account Balance
            </p>
            <p className="text-3xl font-bold text-white">
              ${balance?.total.toFixed(2) || "0.00"}
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Available: ${balance?.available.toFixed(2) || "0.00"}
            </p>
          </div>

          {/* Open Trades Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">
              Open Trades
            </p>
            <p className="text-3xl font-bold text-white">
              {openTrades?.length || 0}
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Last 24 hours
            </p>
          </div>

          {/* Win Rate Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-white">{winRate}%</p>
            <p className="text-slate-500 text-xs mt-2">
              W: {winCount} | L: {lossCount}
            </p>
          </div>

          {/* Accounts Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Accounts</p>
            <p className="text-3xl font-bold text-white">
              {accounts?.length || 0}
            </p>
            <button
              onClick={() => navigate("/accounts")}
              className="text-blue-400 text-xs mt-2 hover:text-blue-300"
            >
              View All
            </button>
          </div>
        </div>

        {/* Accounts Selection */}
        {!accountsLoading && accounts && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className={`p-6 border rounded-lg cursor-pointer transition ${
                    selectedAccountId === account.id
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {account.account_type === "DEMO" ? "Demo" : "Real"}{" "}
                        Account
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {account.name || `Account ${account.id}`}
                      </p>
                    </div>
                    {account.is_default && (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded font-medium">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Balance:</span>
                      <span className="text-white font-semibold">
                        ${account.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Equity:</span>
                      <span className="text-white font-semibold">
                        ${account.equity.toFixed(2)}
                      </span>
                    </div>
                    {account.account_type === "REAL" && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">
                          Leverage:
                        </span>
                        <span className="text-white font-semibold">
                          {account.leverage}:1
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Trades Section */}
        {!tradesLoading && openTrades && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Open Trades ({openTrades.length})
              </h2>
              <button
                onClick={() => navigate("/trade")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
              >
                New Trade
              </button>
            </div>

            {openTrades.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                <p className="text-slate-400">No open trades</p>
                <button
                  onClick={() => navigate("/trade")}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
                >
                  Start Trading
                </button>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">
                        Stake
                      </th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">
                        Entry
                      </th>
                      <th className="px-6 py-3 text-right text-slate-300 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map((trade) => (
                      <tr
                        key={trade.id}
                        className="border-t border-slate-700 hover:bg-slate-700/50"
                      >
                        <td className="px-6 py-4 text-white font-semibold">
                          {trade.symbol}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.trade_type === "CALL"
                                ? "bg-green-600/20 text-green-400"
                                : "bg-red-600/20 text-red-400"
                            }`}
                          >
                            {trade.trade_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          ${trade.stake.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {trade.entry_price.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.status === "OPEN"
                                ? "bg-blue-600/20 text-blue-400"
                                : trade.status === "WON"
                                ? "bg-green-600/20 text-green-400"
                                : "bg-red-600/20 text-red-400"
                            }`}
                          >
                            {trade.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
