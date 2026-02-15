import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const fetchNotifications = async (options = {}) => {
  const { unreadOnly = false, limit = 50 } = options;
  const { data } = await client.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
    params: {
      unread_only: unreadOnly,
      limit,
    },
  });
  return Array.isArray(data) ? data : [];
};

export const markNotificationRead = async (notificationId) => {
  const { data } = await client.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
  return data;
};
