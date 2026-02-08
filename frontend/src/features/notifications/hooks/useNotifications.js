import { useNotificationContext } from "../contexts/NotificationContext.jsx";

export const useNotifications = () => {
  const { notifications, setNotifications } = useNotificationContext();
  return { notifications, setNotifications };
};
