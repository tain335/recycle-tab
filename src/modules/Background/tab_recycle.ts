import { RecycleTab } from "../../model/recycle_tab";
import { TabCache } from './tab_cache';
import { TabStorage } from './tab_storage'
import { emitErrorNotification, emitRecycleNotification } from "./notification";
import { minimatch } from 'minimatch';
import { MessageHandler } from "./message_handler";
import { SettingsValue } from "@src/constants/constants";
import parseUrl from 'parse-url';
import { dispatchUpdateList } from "./message_dispatcher";
import { debounce } from "lodash";

//QUOTA_BYTES_PER_ITEM quota exceeded
export const storage = new TabStorage({ type: 'local' });

export let highlightedTabIds: number[] = [];

export async function recycleTabs(tabs: chrome.tabs.Tab[], skipFilter: boolean = false, autoRemove: boolean = true): Promise<number> {
  const h = new MessageHandler();
  const settings = await h.getSettings();
  return new Promise((resolve) => {
    try {
      const recycleTabs = tabs
        .filter((tab) => {
          if (skipFilter) {
            return true;
          }
          const urlInfo = parseUrl(tab.url ?? '');
          const matchUrl = urlInfo.host + urlInfo.pathname + (urlInfo.search ? '?' + urlInfo.search : '') + (urlInfo.hash ? '#' + urlInfo.hash : '')
          if (settings.recycleIncludes.length) {
            return settings.recycleIncludes.some((pattern) => {
              return minimatch(matchUrl, pattern)
            })
          } else if (settings.recycleExludes.length) {
            return settings.recycleExludes.every((pattern) => {
              return !minimatch(matchUrl, pattern)
            })
          } else {
            return true;
          }
        })
        .map((tab) => new RecycleTab(tab.id ?? 0, tab.url ?? '', tab.title ?? '', Date.now() / 1000, Date.now() / 1000))
      if (!recycleTabs.length) {
        resolve(0);
        return;
      }
      recycleTabs.forEach((tab) => {
        cache?.remove(tab.tabId);
        storage.saveTab(tab);
      })

      if (autoRemove) {
        chrome.tabs.remove(recycleTabs.map((tab) => tab.tabId), () => {
          resolve(recycleTabs.length);
        });
      } else {
        resolve(recycleTabs.length);
      }
    } catch (err: any) {
      emitErrorNotification(err)
    }
  })
}

export let cache: TabCache | undefined;

export function updateCacheFromSettings(newSettings: SettingsValue, oldSettings: SettingsValue) {
  if (newSettings.autoRecycle !== oldSettings.autoRecycle) {
    if (newSettings.autoRecycle) {
      cache?.enable();
      chrome.tabs.query({ pinned: false, groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            cache?.set(tab.id, new RecycleTab(tab.id, tab.url ?? '', tab.title ?? '', Date.now(), -1))
          }
        })
      })
    } else {
      cache?.disable();
    }
  }
  if (newSettings.inactiveDuration !== oldSettings.inactiveDuration) {
    cache?.updateTTL(Number(newSettings.inactiveDuration) * 60 * 1000);
  }
}

let pendingTabQueue: chrome.tabs.Tab[] = [];

async function _scheduleReycle() {
  const processQueue = pendingTabQueue;
  pendingTabQueue = [];
  const len = await recycleTabs(processQueue);
  if (len) {
    dispatchUpdateList();
    emitRecycleNotification(`Recycle ${len} tab(s)`)
  }
}

const scheduleRecycle = debounce(_scheduleReycle, 300);

async function initLRUCache() {
  const settings = await storage.getUserSettings();
  cache = TabCache.init({
    ttl: Number(settings.inactiveDuration) * 60 * 1000,
    onDispose: (tab) => {
      if (tab.url) {
        try {
          chrome.tabs.get(tab.tabId).then(async (tab) => {
            pendingTabQueue.push(tab);
            scheduleRecycle();
          })
        } catch (err: any) {
          emitErrorNotification(err)
        }
      }
    }
  });

  chrome.tabs.query({ pinned: false, groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        cache?.set(tab.id, new RecycleTab(tab.id, tab.url ?? '', tab.title ?? '', Date.now(), -1))
      }
    })
  })
}

export async function initTabRecycle() {
  await initLRUCache();
  // record tab
  chrome.tabs.onCreated.addListener((tab) => {
    try {
      cache?.set(tab.id as number, new RecycleTab(tab.id as number, tab.url ?? '', tab.title ?? '', Date.now(), -1));
    } catch (err: any) {
      emitErrorNotification(err)
    }
  });

  chrome.tabs.onHighlighted.addListener((highlighted) => {
    try {
      highlighted.tabIds.forEach((tabId) => {
        const tab = cache?.get(tabId);
        if (tab) {
          cache?.set(tab.tabId, tab);
        }
      })
    } catch (err: any) {
      emitErrorNotification(err)
    }
    highlightedTabIds = highlighted.tabIds;
  });

  // record tab activated tab
  chrome.tabs.onActivated.addListener((info) => {
    try {
      const tab = cache?.get(info.tabId);
      if (tab) {
        chrome.tabs.get(info.tabId, (t) => {
          tab.update(t);
          cache?.set(info.tabId, tab);
        })
      }
    } catch (err: any) {
      emitErrorNotification(err)
    }
  });

  // record tab activated tab
  chrome.tabs.onUpdated.addListener((id, _, t) => {
    try {
      const tab = cache?.get(id);
      if (tab) {
        tab.update(t);
        cache?.set(id, tab);
      }
    } catch (err: any) {
      emitErrorNotification(err)
    }
  });

  chrome.tabs.onRemoved.addListener((t) => {
    cache?.remove(t);
  });

  chrome.tabs.onReplaced.addListener((addedTabId, removeTabId) => {
    try {
      cache?.remove(removeTabId);
      chrome.tabs.get(addedTabId, (tab) => {
        cache?.set(tab.id as number, new RecycleTab(tab.id as number, tab.url ?? '', tab.title ?? '', Date.now(), -1));
      })
    } catch (err: any) {
      emitErrorNotification(err)
    }
  });

}