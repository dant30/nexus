import { useNotificationContext } from "../contexts/NotificationContext.jsx";

export const useNotifications = () => {
  return useNotificationContext();
};
