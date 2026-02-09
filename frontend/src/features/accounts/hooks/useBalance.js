import { useAccountContext } from "../contexts/AccountContext.jsx";

export const useBalance = () => {
  const { activeAccount, balanceLoading } = useAccountContext();
  return {
    balance: activeAccount?.balance || "0.00",
    currency: activeAccount?.currency || "USD",
    accountType: activeAccount?.account_type || "virtual",
    loading: balanceLoading,
  };
};
