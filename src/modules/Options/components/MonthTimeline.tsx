import React, { useEffect, useMemo, useRef, useState } from 'react';
import VirtualList, { ScrollDirection } from 'react-tiny-virtual-list';
import AutoSizer from "react-virtualized-auto-sizer";
import moment from 'moment';
import { RecycleTab } from '@src/model/recycle_tab';
import { DayTimelineItem, computeSize } from './DayTimeline';
import "./MonthTimeline.css";
import { useDebounceEffect, useThrottleEffect } from 'ahooks';

const DayBarWidth = 24;

const MaxDuration = 12;

const LevelColor = [
  '#b7eb8f',
  '#95de64',
  '#73d13d',
  '#52c41a',
  '#389e0d',
  '#237804',
  '#135200',
  '#092b00',
  '#092b00',
  '#092b00',
]

type OnDaySelect = (d: moment.Moment) => void;

interface MonthProps {
  date: moment.Moment,
  visitDate: moment.Moment,
  data?: DayCount,
  onSelect?: OnDaySelect
}

type DayCount = Record<string, number>;


interface DayProps {
  text: string,
  count: number,
  currentDay: boolean,
  visitDay: boolean;
  weekend: boolean
  onClick?: () => void
}

function Day({ text, count, currentDay, weekend, visitDay, onClick }: DayProps) {
  const level = Math.min(10, count ? ~~(count / 10) + 1 : 0);
  const levels: React.ReactNode[] = [];
  for (let i = 0; i < level; i++) {
    levels.push(<div
      key={i}
      style={{ borderRadius: 4, height: 8, background: LevelColor[i], margin: '0 1px 1px' }}
    ></div>)
  }
  let borderColor = '#ccc';

  if (currentDay) {
    borderColor = '#0958d9';
  } else if (weekend) {
    borderColor = '#ffccc7';
  }
  if (visitDay) {
    borderColor = '#eb2f96';
  }
  return <div
    onClick={() => onClick?.()}
    style={{
      cursor: 'pointer',
      position: 'relative',
      width: 20,
      margin: 2,
      height: 80,
      border: '1px solid #ccc',
      borderWidth: (currentDay || weekend || visitDay) ? 2 : 1,
      borderColor: borderColor,
      borderRadius: 4,
      display: 'flex',
      flexDirection: 'column-reverse',
      justifyContent: 'end',
      textAlign: 'center'
    }}>
    {levels}
    <div style={{ position: 'absolute', width: '100%', textAlign: 'center', bottom: 5, left: 0 }}>{text}</div>
  </div>
}

function Month({ date, data, visitDate, onSelect }: MonthProps) {
  const dayCount = date.daysInMonth();
  const days: React.ReactNode[] = [];
  let cloneDate = date.clone().startOf('M');
  let currentTime = moment();
  for (let i = 0; i < dayCount; i++) {
    const key = cloneDate.format('YYYY-MM-DD');
    const count = data?.[key] ?? 0;
    let selectDate = cloneDate.clone()
    days.push(<Day
      key={key}
      text={String(i + 1)}
      count={count}
      onClick={() => onSelect?.(selectDate)}
      visitDay={visitDate.format('YYYY-MM-DD') === key}
      currentDay={currentTime.format('YYYY-MM-DD') === key}
      weekend={cloneDate.isoWeekday() === 6 || cloneDate.isoWeekday() === 7}
    ></Day>)
    cloneDate.add(1, 'd');
  }
  return <div style={{ width: days.length * DayBarWidth }}>
    <div style={{ display: 'flex' }}>
      {days}
    </div>
    <div style={{
      marginTop: 2,
      marginBottom: 4,
      border: '1px solid #ccc',
      borderRadius: 4,
      padding: '4px 16px',
      textAlign: 'center'
    }}>{date.format('yyyy/MM')}</div>
  </div>
}


export interface MonthTimelineProps {
  tabs: RecycleTab[]
  itemsInDay?: DayTimelineItem[],
  currentOffset?: number,
  currentTime?: number,
  onSelect?: OnDaySelect
}

// 用导数求目前的速度，在衔接上
function useTweenChange(change: number | undefined): [number | undefined, (offset: number) => void] {
  const [current, setCurrent] = useState<number | undefined>(undefined);
  const changeRef = useRef(change ?? 0);
  const frameId = useRef(-1);
  useDebounceEffect(() => {
    if (change === undefined) {
      return;
    }
    if (current === undefined) {
      setCurrent(change);
    } else {
      if (Math.abs(changeRef.current - change) < 120
        && Math.abs(current - change) < 120
      ) {
        return;
      }
      changeRef.current = change;
      cancelAnimationFrame(frameId.current)
      const start = current;
      const end = change;
      const startTime = Date.now();
      const update = () => {
        const now = Date.now();
        const timing = (Math.min(now - startTime, 160) / 160);
        const progress = Math.sin(Math.PI / 2 * timing);
        const c = progress * (end - start) + start;
        setCurrent(c);
        if (progress === 1) {
          return;
        } else {
          frameId.current = requestAnimationFrame(update);
        }
      }
      frameId.current = requestAnimationFrame(update)
    }
  }, [change], { wait: 16 });
  return [current, (offset: number) => {
    setCurrent(offset);
    cancelAnimationFrame(frameId.current)
  }];
}

export function MonthTimeline({ tabs, itemsInDay, currentTime, currentOffset, onSelect }: MonthTimelineProps) {
  const startTime = useMemo(() => {
    if (tabs.length) {
      return moment(tabs[0].recycleTime * 1000).subtract('6', 'M');
    } else {
      return moment().subtract(MaxDuration, 'month');
    }
  }, [tabs])
  const offset = useMemo(() => {
    if (itemsInDay?.length) {
      const day = itemsInDay[0].time.clone().startOf('day').diff(startTime.clone().startOf('M'), 'day');
      const computeHeight = computeSize(itemsInDay);
      const height = itemsInDay.reduce((prev, _, index) => prev + computeHeight(index), 0)
      let diff = (itemsInDay[0].scrollOffset - (currentOffset as number)) / height;
      return Math.max(0, day - 30) * DayBarWidth + diff * DayBarWidth
    }
    return undefined;
  }, [itemsInDay, currentOffset]);
  const [scrollOffset, setScrollOffset] = useTweenChange(offset);
  const monthTimelineItems: Record<string, DayCount> = useMemo(() => {
    const map: Record<string, DayCount> = {}
    tabs.forEach((tab) => {
      const time = moment(tab.recycleTime * 1000);
      const date = time.format("YYYY-MM");
      if (!map[date]) {
        map[date] = {
          [time.format('YYYY-MM-DD')]: 1
        }
      } else if (!map[date][time.format('YYYY-MM-DD')]) {
        map[date][time.format('YYYY-MM-DD')] = 1
      } else {
        map[date][time.format('YYYY-MM-DD')]++
      }
    })
    return map;
  }, [tabs])
  return <AutoSizer disableHeight key={startTime.valueOf()}>{
    ({ width }: { width: number }) => {
      return <VirtualList
        className='month-timeline'
        style={{ display: 'flex' }}
        width={width}
        height={118}
        scrollOffset={scrollOffset}
        onScroll={(offset) => {
          if (scrollOffset && (~~scrollOffset) === ~~offset) {
            return;
          }
          setScrollOffset(offset);
        }}
        itemCount={MaxDuration + 3}
        itemSize={(index) => {
          const time = startTime.clone().add(index, 'month');
          const dayCount = time.daysInMonth();
          return dayCount * DayBarWidth;
        }}
        scrollDirection={ScrollDirection.HORIZONTAL}
        renderItem={({ index, style }) => {
          const time = startTime.clone().add(index, 'month')
          return <div key={index} style={style}><Month visitDate={moment((currentTime ?? 0) * 1000)} date={time} data={monthTimelineItems[time.format("YYYY-MM")]} onSelect={onSelect}></Month></div>
        }}></VirtualList>
    }
  }</AutoSizer>

}