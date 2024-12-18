import { nanoid } from "nanoid";

export class RecycleTab {
  public manualDelete = false;
  public id = nanoid();
  constructor(
    public tabId: number,
    public url: string,
    public title: string,
    public openTime: number,
    public recycleTime: number,
  ) { }

  update(t: chrome.tabs.Tab) {
    this.openTime = Date.now();
    this.title = t.title ?? '';
    this.url = t.url ?? '';
  }
}
