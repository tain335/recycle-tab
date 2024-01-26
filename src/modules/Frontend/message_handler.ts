import { MessageType } from "@src/constants/constants";
import { frontendEmitter } from "@src/events/frontend";

export function initFrontendMessageHandler() {
  const port = chrome.runtime.connect({ name: chrome.runtime.id })
  port.onMessage.addListener((message, port) => {
    console.log('call type: ' + message.type)
    switch (message.type) {
      case MessageType.UpdateTabList:
        frontendEmitter.emit('update_tab_list')
        break;
      default:
        new Error("no match message type");
        break;
    }
  })
}