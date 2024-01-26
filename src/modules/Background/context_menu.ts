import { Action, MessageType } from "../../constants/constants";
import { dispatchMessage, dispatchUpdateList } from "./message_dispatcher";
import { emitRecycleNotification } from "./notification";
import { recycleTabs } from "./tab_recycle";

export function initContextMenu() {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") {
      return;
    }
    chrome.contextMenus.create({
      'id': Action.TriggerRecycleTab,
      "title": "Recycle Tab",
      "contexts": ["all"]
    })
  });

  chrome.contextMenus.onClicked.addListener(async (details) => {
    switch (details.menuItemId) {
      case Action.TriggerRecycleTab:
        const tabs = await chrome.tabs.query({ highlighted: true, active: true, currentWindow: true })
        let len = await recycleTabs(tabs, true, false);
        dispatchUpdateList();
        emitRecycleNotification(`Recycle ${len} tab(s)`)
        break;
      default:
        throw new Error('no match action')
    }
  });
}