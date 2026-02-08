import { listAccounts } from "../services/accountService.js";

export const useAccounts = () => {
  const fetchAccounts = async () => listAccounts();
  return { fetchAccounts };
};
