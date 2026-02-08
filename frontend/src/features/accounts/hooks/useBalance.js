import { useAccountContext } from "../contexts/AccountContext.jsx";

export const useBalance = () => {
  const { activeAccount } = useAccountContext();
  return { balance: activeAccount?.balance || "0.00" };
};
