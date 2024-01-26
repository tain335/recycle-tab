import { Action, MessageType } from "../../constants/constants";
import { dispatchMessage } from "./message_dispatcher";
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
        await recycleTabs(tabs, true);
        dispatchMessage({ type: MessageType.UpdateTabList })
        break;
      default:
        throw new Error('no match action')
    }
  });
}