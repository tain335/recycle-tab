import { RecycleTab } from "@src/model/recycle_tab";

export enum Action {
  TriggerRecycleTab = 'trigger_recycle_tab',
  TriggerStatshTab = 'trigger_stash_tab',
  TriggerPrintTab = 'trigger_print_tab'
}

export enum MessageType {
  UpdateSettings = 'update_settings',
  GetSettings = 'get_settings',
  GetAllTabs = 'get_all_tabs',
  ClearAllTabs = 'clear_all_tabs',
  UpdateTabList = 'update_tab_list',
  ShowConfig = 'show_config',
  ShowPrinter = 'show_printer',
  RemoveTabs = 'remove_tabs',
  GetFavorites = 'get_favorites',
  SaveFavorites = 'save_favorites'
}


export type PrimarySettingsValue = {
  autoRecycle: boolean,
  inactiveDuration: number | string,
  recycleStart: number | string,
};

export type SettingsValue = PrimarySettingsValue & {
  recycleExludes: string[]
  recycleIncludes: string[]
}

export const DefaultSettings: SettingsValue = {
  autoRecycle: false,
  inactiveDuration: 30,
  recycleStart: 10,
  recycleExludes: [],
  recycleIncludes: []
}

export type FavoriteItem = {
  id: string;
  name: string;
  done: boolean,
  tabs: RecycleTab[]
}
