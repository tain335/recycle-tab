import { Action, MessageType } from "../../constants/constants";
import { dispatchUpdateList } from "./message_dispatcher";
import { emitRecycleNotification } from "./notification";
import { recycleTabs } from "./tab_recycle";

export function initContextMenu() {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") {
      return;
    }
    if (FEATURE_RECYCLE) {
      chrome.contextMenus.create({
        documentUrlPatterns: ['https://*/*', 'http://*/*'],
        id: Action.TriggerRecycleTab,
        title: "Recycle Tab",
        contexts: ["all"]
      })
    }
    chrome.contextMenus.create({
      documentUrlPatterns: ['https://*/*', 'http://*/*'],
      id: Action.TriggerPrintTab,
      title: "Print Current Page",
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      documentUrlPatterns: ['https://*/*', 'http://*/*'],
      id: Action.TriggerStatshTab,
      title: "Stash Current Page",
      contexts: ["all"]
    })
  });

  chrome.contextMenus.onClicked.addListener(async (details) => {
    switch (details.menuItemId) {
      case Action.TriggerRecycleTab:
        var tabs = await chrome.tabs.query({ highlighted: true, active: true, currentWindow: true });
        var len = await recycleTabs(tabs, true, false);
        dispatchUpdateList();
        emitRecycleNotification(`Recycle ${len} tab(s)`)
        break;
      case Action.TriggerStatshTab:
        var tabs = await chrome.tabs.query({ highlighted: true, active: true, currentWindow: true });
        var len = await recycleTabs(tabs, true, false);
        dispatchUpdateList();
        emitRecycleNotification(`Stash ${len} page(s) susccess`)
        break;
      case Action.TriggerPrintTab:
        var tabs = await chrome.tabs.query({ highlighted: true, active: true, currentWindow: true });
        if (tabs.length) {
          chrome.storage.local.set({ ['$' + MessageType.ShowPrinter]: tabs[0].url }, () => {
            chrome.runtime.openOptionsPage();
          });
        }
        break;
      default:
        throw new Error('no match action')
    }
  });
}