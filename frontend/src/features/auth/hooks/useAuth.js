import { useAuth } from "../contexts/AuthContext.jsx";
import { loginRequest, logoutRequest } from "../services/authService.js";

export const useAuthActions = () => {
  const { login, logout } = useAuth();

  const signIn = async (username, password) => {
    const res = await loginRequest({ username, password });
    login(res);
    return res;
  };

  const signOut = async () => {
    await logoutRequest();
    logout();
  };

  return { signIn, signOut };
};
