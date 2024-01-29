import { LRUCache } from 'lru-cache';
import { RecycleTab } from '../../model/recycle_tab';
import { highlightedTabIds, storage } from './tab_recycle';

const DefaultTTL = 30 * 60 * 1000;

interface TabCacheOptions {
  ttl?: number,
  onDispose: (tab: RecycleTab) => void
}

export class TabCache {

  private disabled: boolean = false;

  constructor(private cache: LRUCache<number, RecycleTab, (tab: RecycleTab) => void>) { }

  static init(opts: TabCacheOptions) {
    console.log('ttl', opts.ttl ?? DefaultTTL)
    const cache = new TabCache(new LRUCache<number, RecycleTab, (tab: RecycleTab) => void>({
      ttl: opts?.ttl ?? DefaultTTL,
      ttlAutopurge: false,
      allowStale: false,
      max: 10000,
      dispose: (tab, key, reason) => {
        if (reason === 'delete') {
          if (tab.manualDelete) {
            return
          }
          (async function disposeHandler() {
            const tabs = await chrome.tabs.query({});
            const settings = await storage.getUserSettings();
            console.info('recycle debug: ', highlightedTabIds, tab.tabId);
            if (tabs.length > Number(settings.recycleStart) && !highlightedTabIds.includes(tab.tabId)) {
              opts.onDispose?.(tab)
            } else {
              cache.set(key, tab);
            }
          })()
        }
      },
    }));
    return cache;
  }

  get(tabId: number): RecycleTab | undefined {
    if (this.disabled) {
      return undefined;
    }
    return this.cache.get(tabId)
  }

  set(tabId: number, tab: RecycleTab) {
    if (this.disabled) {
      return
    }
    this.cache.set(tabId, tab);
  }

  remove(tabId: number) {
    if (this.disabled) {
      return;
    }
    const tab = this.cache.get(tabId)
    if (tab) {
      tab.manualDelete = true;
      this.cache.delete(tabId);
    }
  }

  size() {
    return this.cache.size
  }

  updateTTL(ttl: number) {
    console.info('update ttl', ttl)
    this.cache.ttl = ttl;
  }

  disable() {
    this.disabled = true;
    this.cache.clear();
  }

  enable() {
    this.disabled = false;
  }

  pureStale() {
    if (!this.disable) {
      return
    }
    console.info('purgeStale')
    this.cache.purgeStale();
  }
}