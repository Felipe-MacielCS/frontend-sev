const NOTIFICATION_EVENT_NAME = "app-notifications-refresh";
const NOTIFICATION_STORAGE_KEY = "app_notifications_refresh_at";
const NOTIFICATION_CHANNEL_NAME = "app-notifications";

let notificationChannel = null;

const getNotificationChannel = () => {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }

  if (!notificationChannel) {
    notificationChannel = new window.BroadcastChannel(NOTIFICATION_CHANNEL_NAME);
  }

  return notificationChannel;
};

export const emitNotificationRefresh = () => {
  if (typeof window === "undefined") return;

  const detail = { at: Date.now() };

  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT_NAME, { detail }));

  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(detail.at));
  } catch (error) {
    console.error("Could not persist notification refresh marker:", error);
  }

  const channel = getNotificationChannel();
  if (channel) {
    channel.postMessage(detail);
  }
};

export const subscribeToNotificationRefresh = (callback) => {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }

  const handleWindowEvent = () => callback();
  const handleStorageEvent = (event) => {
    if (event.key === NOTIFICATION_STORAGE_KEY) {
      callback();
    }
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };
  const handleFocus = () => callback();

  window.addEventListener(NOTIFICATION_EVENT_NAME, handleWindowEvent);
  window.addEventListener("storage", handleStorageEvent);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleFocus);

  const channel = getNotificationChannel();
  let handleChannelMessage = null;
  if (channel) {
    handleChannelMessage = () => callback();
    channel.addEventListener("message", handleChannelMessage);
  }

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT_NAME, handleWindowEvent);
    window.removeEventListener("storage", handleStorageEvent);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleFocus);

    if (channel && handleChannelMessage) {
      channel.removeEventListener("message", handleChannelMessage);
    }
  };
};
