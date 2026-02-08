/**
 * Trading Page
 * Interface for executing trades (CALL/PUT, RISE/FALL)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";
import { useQuery, useMutation } from "../hooks/useApi.js";
import { useWebSocket } from "../providers/WSProvider.jsx";

export function TradingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected: wsConnected, onMessage } = useWebSocket();

  // Fetch accounts
  const { data: accounts } = useQuery("/accounts");

  // Get primary account
  const primaryAccount = accounts?.[0];

  // Trading form state
  const [tradeForm, setTradeForm] = useState({
    accountId: null,
    symbol: "EURUSD",
    tradeType: "CALL", // CALL or PUT
    direction: "RISE", // RISE or FALL (for binary)
    stake: "10",
    expiry: "5", // 5 minutes
    notes: "",
  });

  const [currentPrice, setCurrentPrice] = useState(null);
  const [error, setError] = useState(null);

  // Execute trade mutation
  const { mutate: executeTrade, loading: executing } = useMutation();

  // Listen for price updates from WebSocket
  useEffect(() => {
    const unsubscribe = onMessage("tick", (tick) => {
      if (tick.symbol === tradeForm.symbol) {
        setCurrentPrice(tick.price);
      }
    });

    return unsubscribe;
  }, [tradeForm.symbol, onMessage]);

  // Set default account on load
  useEffect(() => {
    if (primaryAccount && !tradeForm.accountId) {
      setTradeForm((prev) => ({
        ...prev,
        accountId: primaryAccount.id,
      }));
    }
  }, [primaryAccount, tradeForm.accountId]);

  const handleFormChange = (field, value) => {
    setTradeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExecuteTrade = async (e) => {
    e.preventDefault();
    setError(null);

    if (!tradeForm.accountId) {
      setError("Please select an account");
      return;
    }

    if (!tradeForm.stake || parseFloat(tradeForm.stake) <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    try {
      const payload = {
        account_id: tradeForm.accountId,
        symbol: tradeForm.symbol,
        trade_type: tradeForm.tradeType,
        direction: tradeForm.direction,
        stake: parseFloat(tradeForm.stake),
        expiry_minutes: parseInt(tradeForm.expiry),
        notes: tradeForm.notes,
      };

      const result = await executeTrade("/trades/execute", {
        method: "POST",
        body: payload,
      });

      if (result.success) {
        // Show success message
        alert("Trade executed successfully!");
        // Reset form
        setTradeForm((prev) => ({
          ...prev,
          stake: "10",
          notes: "",
        }));
      } else {
        setError(result.error || "Failed to execute trade");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  const symbols = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "NZDUSD",
    "USDCAD",
    "GOLD",
    "OIL",
  ];
  const expiryOptions = ["1", "5", "15", "30", "60"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-white">Trading</h1>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Execute Trade
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleExecuteTrade} className="space-y-6">
                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Account
                  </label>
                  <select
                    value={tradeForm.accountId || ""}
                    onChange={(e) =>
                      handleFormChange("accountId", parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select an account</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_type === "DEMO" ? "Demo" : "Real"} -{" "}
                        ${account.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Symbol
                  </label>
                  <select
                    value={tradeForm.symbol}
                    onChange={(e) =>
                      handleFormChange("symbol", e.target.value)
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    {symbols.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Price */}
                {currentPrice && (
                  <div className="p-4 bg-slate-700/50 border border-slate-600 rounded">
                    <p className="text-slate-400 text-sm">Current Price</p>
                    <p className="text-2xl font-bold text-white">
                      {currentPrice.toFixed(4)}
                    </p>
                  </div>
                )}

                {/* Trade Type (Call/Put) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Trade Type
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleFormChange("tradeType", "CALL")}
                      className={`flex-1 py-3 rounded font-medium transition ${
                        tradeForm.tradeType === "CALL"
                          ? "bg-green-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      CALL (Up)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormChange("tradeType", "PUT")}
                      className={`flex-1 py-3 rounded font-medium transition ${
                        tradeForm.tradeType === "PUT"
                          ? "bg-red-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      PUT (Down)
                    </button>
                  </div>
                </div>

                {/* Direction (Rise/Fall) - Alternative */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Direction
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleFormChange("direction", "RISE")}
                      className={`flex-1 py-3 rounded font-medium transition ${
                        tradeForm.direction === "RISE"
                          ? "bg-green-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      RISE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormChange("direction", "FALL")}
                      className={`flex-1 py-3 rounded font-medium transition ${
                        tradeForm.direction === "FALL"
                          ? "bg-red-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      FALL
                    </button>
                  </div>
                </div>

                {/* Stake */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Stake (USD)
                  </label>
                  <input
                    type="number"
                    value={tradeForm.stake}
                    onChange={(e) =>
                      handleFormChange("stake", e.target.value)
                    }
                    min="0.35"
                    max="1000"
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="10.00"
                  />
                  <p className="text-slate-400 text-xs mt-2">
                    Min: $0.35, Max: $1,000
                  </p>
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expiry (Minutes)
                  </label>
                  <select
                    value={tradeForm.expiry}
                    onChange={(e) => handleFormChange("expiry", e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    {expiryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} minutes
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={tradeForm.notes}
                    onChange={(e) =>
                      handleFormChange("notes", e.target.value)
                    }
                    rows="3"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="Add notes about this trade..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={executing || !wsConnected}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded transition text-lg"
                >
                  {executing ? "Executing..." : "Execute Trade"}
                </button>
              </form>
            </div>
          </div>

          {/* Summary Panel */}
          <div>
            {/* Account Info */}
            {primaryAccount && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Account Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balance:</span>
                    <span className="text-white font-semibold">
                      ${primaryAccount.balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Equity:</span>
                    <span className="text-white font-semibold">
                      ${primaryAccount.equity.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="text-white font-semibold">
                      {primaryAccount.account_type}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trade Summary */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Trade Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Symbol:</span>
                  <span className="text-white font-semibold">
                    {tradeForm.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span
                    className={`font-semibold ${
                      tradeForm.tradeType === "CALL"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {tradeForm.tradeType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stake:</span>
                  <span className="text-white font-semibold">
                    ${parseFloat(tradeForm.stake || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiry:</span>
                  <span className="text-white font-semibold">
                    {tradeForm.expiry} min
                  </span>
                </div>

                <div className="border-t border-slate-700 pt-3 mt-3">
                  <p className="text-slate-400 text-sm">
                    Potential Return: Depends on market movement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
