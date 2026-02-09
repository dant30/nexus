import { useAccountContext } from "../contexts/AccountContext.jsx";

export const useBalance = () => {
  const context = useAccountContext();
  if (!context) {
    return {
      balance: "0.00",
      currency: "USD",
      accountType: "virtual",
      loading: false,
    };
  }
  const { activeAccount, balanceLoading } = context;
  return {
    balance: activeAccount?.balance || "0.00",
    currency: activeAccount?.currency || "USD",
    accountType: activeAccount?.account_type || "virtual",
    loading: balanceLoading,
  };
};
