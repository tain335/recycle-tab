import { DefaultSettings, FavoriteItem, SettingsValue } from "@src/constants/constants";
import { RecycleTab } from "../../model/recycle_tab";
// sync 限制512 MAX_ITEMS，
//每个小时写入次数 1800 MAX_WRITE_OPERATIONS_PER_HOUR
//每分钟写入次数 120 MAX_WRITE_OPERATIONS_PER_MINUTE
//每个item最多8192bytes  QUOTA_BYTES_PER_ITEM // 8KB
//总共最多102400 QUOTA_BYTES // 100KB

// local
// QUOTA_BYTES 10485760 // 10MB

// 采用先写入本地 再通过队列写入远程
export class TabStorage {

  private storage: typeof chrome.storage.sync | typeof chrome.storage.local = chrome.storage.sync;

  constructor({ type }: { type: 'sync' | 'local' }) {
    if (type === 'sync') {
      this.storage = chrome.storage.sync
    } else {
      this.storage = chrome.storage.local
    }
  }

  bytesInUse(): Promise<number> {
    return new Promise((resolve) => {
      this.storage.getBytesInUse((number) => resolve(number))
    })
  }

  capacity(): number {
    return this.storage.QUOTA_BYTES
  }

  async remove(key: string) {
    await this.storage.remove(key)
  }

  async removeTabs(ids: number[]) {
    await this.storage.remove(ids.map((id) => `$tab_${id}`))
  }

  async removeAllTabs() {
    const all = await this.getAllTabs();
    const tabKeys = all.map((tab) => `$tab_${tab.tabId}`)
    await this.storage.remove(tabKeys)
  }

  async get(key: string): Promise<any> {
    return (await this.storage.get(key))[key]
  }

  async set(key: string, value: any): Promise<void> {
    await this.storage.set({ [key]: value })
  }

  async getUserSettings(): Promise<SettingsValue> {
    return await this.get('$user_settings') ?? DefaultSettings
  }

  async saveUserSettings(data: any) {
    return await this.set('$user_settings', data);
  }

  async saveFavorites(favorites: FavoriteItem[]) {
    await this.set('$favorites', favorites);
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    return await this.get('$favorites') ?? []
  }

  async saveTab(tab: RecycleTab) {
    await this.set(`$tab_${tab.tabId}`, tab)
  }

  async getAllTabs(): Promise<RecycleTab[]> {
    const data = await this.storage.get(null)
    const result = Object.keys(data).filter((key) => key.startsWith('$tab_')).map((key) => data[key])
    return result;
  }

  async getTabs(from: number, to: number): Promise<RecycleTab[]> {
    const tabs = await this.getAllTabs()
    return tabs.filter((tab) => tab.recycleTime >= from && tab.recycleTime < to);
  }

}

