import { useAccountContext } from "../contexts/AccountContext.jsx";

const normalizeAccountType = (value) => {
  if (!value) return null;
  const raw = value.toString().toLowerCase();
  if (raw.includes("demo") || raw.includes("virtual")) return "Virtual";
  if (raw.includes("real")) return "Real";
  return value;
};

export const useBalance = () => {
  const context = useAccountContext();
  if (!context) {
    return {
      balance: null,
      currency: null,
      accountType: null,
      accountId: null,
      loading: false,
      status: "unavailable",
    };
  }
  const { activeAccount, balanceLoading } = context;
  return {
    balance: activeAccount?.balance ?? null,
    currency: activeAccount?.currency ?? null,
    accountType: normalizeAccountType(activeAccount?.account_type),
    accountId: activeAccount?.deriv_account_id ?? null,
    loading: balanceLoading,
    status: activeAccount ? "ready" : "empty",
  };
};
