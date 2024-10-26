import moment from "moment";
import React, { useMemo, useRef, useState } from "react";
import VirtualList from 'react-tiny-virtual-list';
import AutoSizer from "react-virtualized-auto-sizer";
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { RecycleTab } from "@src/model/recycle_tab";
import { Checkbox } from "@mui/material";
import { useControllableValue } from "ahooks";
import { ConfirmDialog } from "@src/components/ConfirmDialog";
import { PDFMaker, PDFMakerRef, ConvertUpdateState, loadFonts } from "@src/components/PDFMaker";
import { FavoritesDialog } from "./FavoritesDialog";
import { useNotifications } from "@toolpad/core";

interface TabItemProps {
  tab: RecycleTab,
  selected: boolean,
  onSelectedChange: (tab: RecycleTab, selected: boolean) => void,
  onRemove: (tab: RecycleTab) => void
}

function TabItem({ tab, onRemove, selected, onSelectedChange }: TabItemProps) {
  const notifications = useNotifications();
  const [convertState, setConvertState] = useState<ConvertUpdateState>();
  const pdfMakerRef = useRef<PDFMakerRef>(null);
  const [converting, setConverting] = useState(false);
  return <div style={{ display: "flex", marginBottom: 10, background: selected ? '#e6f4ff' : '' }}>
    <div style={{ lineHeight: '32px', fontSize: '16px', cursor: 'pointer', flex: 1 }} onClick={(e) => {
      if (e.currentTarget === e.target) {
        onSelectedChange(tab, !selected);
      }
    }}>
      <div style={{ display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
        <Link
          target="_blank"
          style={{
            display: 'inline-block',
            paddingLeft: 10,
            paddingRight: 20,
            boxSizing: 'border-box',
            maxWidth: '50vw',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} href={tab.url}>{tab.title}</Link>
      </div>
    </div>
    <div style={{ width: 320, textAlign: 'right', cursor: 'pointer' }} onClick={(e) => {
      if (e.currentTarget === e.target) {
        onSelectedChange(tab, !selected);
      }
    }}>
      <FavoritesDialog favoriteTabs={[tab]}>
        {(setOpen) => <Button style={{ marginRight: 10 }} variant="outlined" size="small" onClick={() => setOpen(true)}>Favorite</Button>}
      </FavoritesDialog>
      <ConfirmDialog
        width='100%'
        title={"PDF Converter"}
        confirmText="Convert"
        confirmLoading={converting}
        confirmDisabled={!convertState?.settings.pageSettings.targetElement || converting}
        onConfirm={async () => {
          try {
            if (!convertState?.settings.pageSettings.targetElement) {
              return;
            }
            setConverting(true);
            await pdfMakerRef.current?.convert();
          } catch (err) {
            notifications.show('Oops! Convert fail, please try again.', {
              severity: 'error'
            });
            throw err
          } finally {
            setConverting(false)
          }
        }}
        content={<PDFMaker
          ref={pdfMakerRef}
          waiting={converting}
          waitingText="converting..."
          src={tab.url}
          title={tab.title}
          width={1100}
          onUpdate={(state) => {
            setConvertState(state);
          }}></PDFMaker>}>
        {
          (setVisible) => <Button variant="outlined" size="small" style={{ marginRight: 10 }} onClick={async () => {
            await loadFonts();
            setVisible(true)
            setConverting(false)
          }}>Convert</Button>
        }
      </ConfirmDialog>
      <ConfirmDialog title='Tips' content='Are you sure to remove this tab?'
        onConfirm={async () => {
          onRemove(tab)
        }}>
        {(setOpen) => <Button color="error" style={{ marginRight: 10 }} variant="outlined" size="small" onClick={(e) => {
          setOpen(true)
        }}>Remove</Button>}
      </ConfirmDialog>
      <Checkbox checked={selected} onChange={(e) => {
        onSelectedChange(tab, e.target.checked);
      }}></Checkbox>
    </div>
  </div>
}

interface DayProps {
  time: moment.Moment
  tabs: RecycleTab[]
  split?: boolean
  onRemove: TabItemProps['onRemove']
  selectedTabs: string[]
  onSelectedChange: TabItemProps['onSelectedChange']
}

function Day({ time, tabs, split, onRemove, selectedTabs, onSelectedChange }: DayProps) {
  return <div>
    {split ?
      <div style={{ height: 1, background: '#ccc', margin: '9px 40px 10px 40px', textAlign: 'center', }}>
        <span style={{ position: 'relative', display: 'inline-block', background: '#fff', color: '#999', padding: '0 20px', top: -8 }}>{time.format('YYYY-MM-DD')}</span>
      </div> : <></>}
    <div style={{ display: 'flex', paddingBottom: 5, paddingLeft: 40, paddingRight: 40, boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0, minWidth: 120, alignSelf: "start", justifySelf: 'center', fontSize: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#999' }}>{time.format('YYYY-MM-DD')}</div>
        <div style={{ fontWeight: 'bold' }}>{time.format('HH:mm')}</div>
      </div>
      <div style={{ minWidth: 4, borderRadius: '4px', background: '#67C23A' }}></div>
      <div style={{ flex: 1 }}>
        {
          tabs.map((tab) => {
            return <TabItem
              key={tab.id}
              tab={tab}
              onRemove={onRemove}
              selected={selectedTabs.includes(tab.id)}
              onSelectedChange={onSelectedChange}
            ></TabItem>
          })
        }
      </div>
    </div>
  </div>
}

export interface DayTimelineItem {
  tabs: RecycleTab[];
  time: moment.Moment;
  split?: boolean;
  scrollOffset: number;
}

export interface DayTimelineProps {
  onScrollItem?(item: DayTimelineItem, scrollOffset: number, itemsInDay: DayTimelineItem[]): void
  selectTime?: moment.Moment
  tabs: RecycleTab[]
  selectedTabs?: string[]
  onSelecteTabs?: (tabs: string[]) => void
  onRemove: TabItemProps['onRemove']
}

export const computeSize = (tabs: DayTimelineItem[]) => (index: number) => {
  if (index === 0 || tabs[index - 1].time.format('YYYY-MM-DD') !== tabs[index].time.format('YYYY-MM-DD')) {
    tabs[index].split = true;
    return tabs[index].tabs.length * 52 + 12 + 20
  }
  return tabs[index].tabs.length * 52 + 12
}

export function DayTimeline({ onScrollItem, tabs, selectTime, onRemove, ...props }: DayTimelineProps) {
  const [selectedTabs, setSelectedTabs] = useControllableValue<string[]>(props, { trigger: 'onSelecteTabs', valuePropName: 'selectedTabs', defaultValue: [] })
  const previousOffset = useRef<number>()
  const getItemsInDay = (items: DayTimelineItem[], m: moment.Moment) => {
    let start = m.clone().startOf('d').unix();
    let end = m.clone().endOf('d').unix();
    const result: DayTimelineItem[] = [];
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (item.time.unix() > start && item.time.unix() < end) {
        result.push(item);
      }
      if (item.time.unix() < start) {
        break;
      }
    }
    return result;
  }
  const dayTimeItems = useMemo(() => {
    if (!tabs.length) {
      return [];
    }
    const map: Record<string, DayTimelineItem> = {};
    tabs.forEach((item) => {
      const time = moment(item.recycleTime * 1000).format('YYYY-MM-DD HH:mm')
      if (!map[time]) {
        map[time] = { time: moment(item.recycleTime * 1000), tabs: [item], scrollOffset: 0 }
      } else {
        map[time].tabs.push(item)
      }
    })
    let scrollOffset = 0;
    const items = Object.values(map);
    const compute = computeSize(items)
    items.forEach((item, index) => {
      item.scrollOffset = scrollOffset
      scrollOffset = scrollOffset + compute(index)
    })
    if (items.length) {
      setTimeout(() => {
        onScrollItem?.(
          items[0],
          0,
          getItemsInDay(items, items[0].time.clone())
        )
      }, 0)
    }
    return items;
  }, [tabs]);
  const offset = useMemo(() => {
    if (selectTime) {
      const target = selectTime.format('YYYY-MM-DD');
      const found = dayTimeItems.find((item) => {
        return item.time.format('YYYY-MM-DD') === target
      });
      if (found) {
        setTimeout(() => {
          onScrollItem?.(
            found,
            found.scrollOffset,
            getItemsInDay(dayTimeItems, found.time.clone())
          )
        }, 0)
        return found.scrollOffset
      }
    }
    return previousOffset.current;
  }, [selectTime, dayTimeItems])
  previousOffset.current = offset;
  if (dayTimeItems.length === 0) {
    return <div style={{ display: "flex", justifyContent: 'center', alignItems: 'center', color: '#acacac', fontSize: 36, minHeight: '100%' }}><div style={{ marginBottom: 120 }}>No Data</div></div>
  }
  return <AutoSizer disableWidth>{
    ({ height }: { height: number }) => {
      return <VirtualList
        width="100%"
        height={height}
        itemCount={dayTimeItems.length}
        itemSize={computeSize(dayTimeItems)}
        scrollOffset={offset}
        onScroll={(offset, event) => {
          // @ts-ignore
          const scrollTabIndex = dayTimeItems.findLastIndex((item) => {
            if (item.scrollOffset < offset) {
              return true
            }
          })
          const scrollTab = dayTimeItems[scrollTabIndex]
          if (scrollTab) {
            onScrollItem?.(scrollTab, offset, getItemsInDay(dayTimeItems, scrollTab.time.clone()))
          } else {
            if (dayTimeItems[0]) {
              onScrollItem?.(dayTimeItems[0], offset, getItemsInDay(dayTimeItems, dayTimeItems[0].time.clone()))
            }
          }
        }}
        renderItem={({ index, style }) => {
          return <div key={index} style={{ ...style }} >
            <Day
              time={dayTimeItems[index].time}
              tabs={dayTimeItems[index].tabs}
              split={dayTimeItems[index].split}
              selectedTabs={selectedTabs}
              onRemove={onRemove}
              onSelectedChange={(tab, selected) => {
                if (selected) {
                  if (!selectedTabs.includes(tab.id)) {
                    setSelectedTabs([...selectedTabs, tab.id])
                  }
                } else {
                  const index = selectedTabs.indexOf(tab.id);
                  if (index !== -1) {
                    let clone = selectedTabs.slice(0, selectedTabs.length);
                    clone.splice(index, 1)
                    setSelectedTabs(clone)
                  }
                }
              }}
            ></Day>
          </div>
        }}></VirtualList >
    }
  }</AutoSizer >
}