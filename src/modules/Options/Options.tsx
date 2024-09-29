import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Options.css';
import { MonthTimeline } from './components/MonthTimeline';
import { DayTimeline, DayTimelineItem } from './components/DayTimeline';
import Input from '@mui/material/Input';
import { SettingsButton } from './components/SettingsButton';
import { RecycleTab } from '@src/model/recycle_tab';
import { MessageType } from '@src/constants/constants';
import { frontendEmitter } from '@src/events/frontend';
import { useMemoizedFn } from 'ahooks';
import moment from 'moment';
import { Button, Drawer } from '@mui/material';
import { ConfirmDialog } from '@src/components/ConfirmDialog';
import { FavoritesDialog } from './components/FavoritesDialog';
import { ConvertPageDialog } from './components/ConvertPageDialog';
import { BatchConvertState, BatchPDFMaker, BatchPDFMakerRef } from '@src/components/BatchPDFMaker';

interface Props {
  title?: string;
}

const Options: React.FC<Props> = ({ title }: Props) => {
  const [tabs, setTabs] = useState<RecycleTab[]>([]);
  const [itemsInDay, setItemsInDay] = useState<DayTimelineItem[]>([]);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectTime, setSelectTime] = useState<moment.Moment>();
  const [selectedTabs, setSelectedTabs] = useState<number[]>([]);
  const batchPDFMakerRef = useRef<BatchPDFMakerRef>(null);
  const [batchConvertState, setBatchConvertState] = useState(BatchConvertState.Pending);
  const [filter, setFilter] = useState('');

  const filterTabs = useMemo(() => {
    if (filter) {
      return tabs.filter((tab) => tab.title.includes(filter) || tab.url.includes(filter))
    } else {
      return tabs;
    }
  }, [filter, tabs])

  const update = useMemoizedFn(async () => {
    try {
      const res = await chrome.runtime.sendMessage<any, RecycleTab[]>({ type: MessageType.GetAllTabs });
      res.sort((a, b) => b.recycleTime - a.recycleTime);
      setItemsInDay([])
      setCurrentOffset(0);
      setTabs(res)
    } catch (err) {
      console.error(err);
    }
  })

  useEffect(() => {
    frontendEmitter.on('update_tab_list', update);
    update();
    return () => {
      frontendEmitter.off('update_tab_list', update);
    }
  }, []);

  const onRemove = async (tab: RecycleTab) => {
    await chrome.runtime.sendMessage({ type: MessageType.RemoveTabs, data: [tab.tabId] });
    const index = selectedTabs.indexOf(tab.tabId)
    if (index !== -1) {
      const selected = selectedTabs.slice(0, selectedTabs.length).splice(index, 1);
      setSelectedTabs(selected);
    }
    update();
  }

  return <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
    <MonthTimeline
      tabs={filterTabs}
      itemsInDay={itemsInDay}
      currentOffset={currentOffset}
      currentTime={currentTime}
      onSelect={(m) => {
        setSelectTime(m);
      }}
    ></MonthTimeline>
    <div style={{ border: '1px solid #ececec', margin: '0 0 10px 0' }}></div>
    <div style={{ display: 'flex', margin: '20px 60px 20px 60px' }}>
      <div style={{ flex: 1 }}>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 400 }} placeholder='Title or URL'></Input>
      </div>
      <div>
        {/* <ButtonGroup size='small' variant="outlined">
          <Button>Group By Domain</Button>
          <Button>Group By Day</Button>
        </ButtonGroup> */}
      </div>
    </div>
    <div style={{ flex: 1, }}>
      <DayTimeline
        tabs={filterTabs}
        selectTime={selectTime}
        onRemove={onRemove}
        selectedTabs={selectedTabs}
        onSelecteTabs={(tabs) => {
          setSelectedTabs(tabs);
        }}
        onScrollItem={(current, offset, itemsInDay) => {
          setItemsInDay(itemsInDay)
          setCurrentOffset(offset)
          setCurrentTime(current.time.unix());
        }}></DayTimeline>
    </div>
    <Drawer variant="persistent" open={!!selectedTabs.length} anchor='bottom' hideBackdrop>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'end', height: 60, margin: '0 160px' }}>
        <ConfirmDialog title="PDF Converter"
          confirmText="Convert All"
          confirmTips={batchConvertState === BatchConvertState.Pending ? 'Please set all page settings' : ''}
          confirmDisabled={batchConvertState !== BatchConvertState.Ready}
          confirmLoading={batchConvertState === BatchConvertState.Working}
          width={1100}
          content={<BatchPDFMaker
            onStateChange={(state) => {
              setBatchConvertState(state);
            }}
            ref={batchPDFMakerRef}
            tabs={selectedTabs.map((id) => tabs.find((t) => t.tabId === id)).filter(Boolean) as RecycleTab[]}
          ></BatchPDFMaker>}
          onConfirm={async () => {
            await batchPDFMakerRef.current?.convertAll();
          }}>
          {
            (setPDFMakerOpen) => <Button variant='outlined' size='small' onClick={() => {
              setPDFMakerOpen(true);
            }}>Batch Convert({selectedTabs.length})</Button>
          }
        </ConfirmDialog>
        <FavoritesDialog
          favoriteTabs={selectedTabs.map((id) => tabs.find((t) => t.tabId === id)).filter(Boolean) as RecycleTab[]}
          onConfirm={async () => {
            setSelectedTabs([])
          }}>
          {(setOpen) => <Button variant='outlined' size='small' style={{ marginLeft: 10 }} onClick={() => {
            setOpen(true);
          }}>Batch Favorite({selectedTabs.length})</Button>}
        </FavoritesDialog>

        <Button style={{ marginLeft: 10 }} variant='outlined' size='small' onClick={() => {
          selectedTabs.map((id) => tabs.find((t) => t.tabId === id)).forEach((t) => {
            if (t) {
              window.open(t?.url)
            }
          })
          setSelectedTabs([]);
        }}>Batch Open({selectedTabs.length})</Button>
        <ConfirmDialog title='Tips' content='Are you sure to remove these records?'
          onConfirm={async () => {
            await chrome.runtime.sendMessage({ type: MessageType.RemoveTabs, data: selectedTabs });
            setSelectedTabs([])
            frontendEmitter.emit('update_tab_list');
          }}>
          {(setOpen) => <Button
            style={{ marginLeft: 10 }}
            variant="outlined"
            size='small'
            color='error'
            onClick={() => {
              setOpen(true)
            }}>Batch Remove({selectedTabs.length})</Button>}
        </ConfirmDialog>
        <Button
          variant="outlined"
          size='small'
          style={{ marginLeft: 10 }}
          onClick={() => {
            setSelectedTabs([])
          }}>Cancel Select</Button>
      </div>
    </Drawer >
    <SettingsButton></SettingsButton>
    <ConvertPageDialog></ConvertPageDialog>
  </div >;
};

export default Options;
