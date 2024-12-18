import { FavoriteItem, MessageType, SettingsValue } from "../../constants/constants";
import { storage, updateCacheFromSettings } from "./tab_recycle";

export class MessageHandler {

  async getSettings(): Promise<SettingsValue> {
    // 如果用户没有登录chrome，sync就等同于local
    return await storage.getUserSettings();
  }

  async updateSettings(newSettings: SettingsValue) {
    const oldSettings = await storage.getUserSettings();
    await storage.saveUserSettings(newSettings);
    updateCacheFromSettings(newSettings, oldSettings)
  }

  async getAllTabs() {
    return await storage.getAllTabs();
  }

  async clearAllTabs() {
    return await storage.removeAllTabs();
  }

  async removeTabs(ids: string[]) {
    return await storage.removeTabs(ids)
  }

  async getFavorites() {
    return await storage.getFavorites()
  }

  async setFavorites(newFavorites: FavoriteItem[]) {
    await storage.saveFavorites(newFavorites);
  }

}


export function initMessageHandler() {
  const h = new MessageHandler();
  async function callHandler(handler: (data: any) => Promise<any>, data: any, sendResponse: (response?: any) => void) {
    try {
      const res = await handler(data);
      console.info('call response: ', res)
      sendResponse(res);
    } catch (err) {
      sendResponse(err)
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.info('call type: ' + message.type)
    switch (message.type) {
      case MessageType.GetSettings:
        callHandler(h.getSettings, message.data, sendResponse);
        break;
      case MessageType.UpdateSettings:
        callHandler(h.updateSettings, message.data, sendResponse);
        break;
      case MessageType.GetAllTabs:
        callHandler(h.getAllTabs, message.data, sendResponse);
        break;
      case MessageType.ClearAllTabs:
        callHandler(h.clearAllTabs, message.data, sendResponse);
        break;
      case MessageType.RemoveTabs:
        callHandler(h.removeTabs, message.data, sendResponse);
        break;
      case MessageType.GetFavorites:
        callHandler(h.getFavorites, message.data, sendResponse);
        break;
      case MessageType.SaveFavorites:
        callHandler(h.setFavorites, message.data, sendResponse);
        break;
      default:
        sendResponse(new Error("no match message type"));
        break;
    }
    // very imporant
    return true;
  })
}