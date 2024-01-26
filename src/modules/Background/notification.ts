import { nanoid } from "nanoid";
import icon from "../../assets/img/icon-192.png"

let prevNotificationId = ""

export function emitErrorNotification(err: Error) {
  if (prevNotificationId) {
    chrome.notifications.clear(prevNotificationId)
  }
  const notificationId = nanoid();
  chrome.notifications.create(notificationId, {
    iconUrl: icon,
    title: 'Recycle Tabs Error',
    message: err.toString(),
    type: 'basic',
  });
  prevNotificationId = notificationId;
}

export function emitRecycleNotification(content: string) {
  if (prevNotificationId) {
    chrome.notifications.clear(prevNotificationId)
  }
  const notificationId = nanoid();
  chrome.notifications.create(notificationId, {
    iconUrl: icon,
    title: 'Recycle Tabs Process',
    message: content,
    type: 'basic',
  });
  prevNotificationId = notificationId;
}