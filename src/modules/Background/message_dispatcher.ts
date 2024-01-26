import { MessageType } from "@src/constants/constants";
import { debounce } from "lodash";

const clients: chrome.runtime.Port[] = [];

export function dispatchMessage(message: any) {
  clients.forEach((c) => {
    c.postMessage(message)
  })
}

export function initMessageDispatcher() {
  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
      let index = clients.indexOf(port);
      if (index !== -1) {
        clients.splice(index, 1)
      }
    })
    clients.push(port);
  });
}

export function dispatchUpdateList() {
  dispatchMessage({ type: MessageType.UpdateTabList })
}
