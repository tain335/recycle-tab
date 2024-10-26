import { nanoid } from "nanoid";

let prevNotificationId = ""

export function emitErrorNotification(err: Error) {
  if (prevNotificationId) {
    chrome.notifications.clear(prevNotificationId)
  }
  const notificationId = nanoid();
  chrome.notifications.create(notificationId, {
    iconUrl: chrome.runtime.getURL("/icon-192.png"),
    title: 'Rabbit HTML2PDF Error',
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
    iconUrl: chrome.runtime.getURL("/icon-192.png"),
    title: 'Rabbit HTML2PDF',
    message: content,
    type: 'basic',
  });
  prevNotificationId = notificationId;
}

export function emitStashNotification(content: string) {
  if (prevNotificationId) {
    chrome.notifications.clear(prevNotificationId)
  }
  const notificationId = nanoid();
  chrome.notifications.create(notificationId, {
    iconUrl: chrome.runtime.getURL("/icon-192.png"),
    title: 'Rabbit HTML2PDF',
    message: content,
    type: 'basic',
  });
  prevNotificationId = notificationId;
}