import { RecycleTab } from '@src/model/recycle_tab';
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { SortableList } from './SortableList';
import { IconButton, Tooltip } from '@mui/material';
import { Delete, Done, DragIndicator, Refresh, WarningOutlined } from '@mui/icons-material';
import { PDFMaker, PDFMakerRef, ConvertUpdateState } from './PDFMaker';
import { Loading } from './Loading';
import { similarityURL } from '@src/utils/similarityUrl';
import { cloneDeep } from 'lodash';
import { BatchConvertTaskQueue } from './BatchConvertTaskQueue';

import mitt from 'mitt';
import { downloadBlob, merge } from 'web2pdf';

export enum BatchConvertState {
  Pending = 'pending',
  Ready = 'ready',
  Working = 'working',
  Interrupt = 'Interrupt',
  Done = 'done',
}

export enum ConvertState {
  Pending = 'pending',
  Ready = 'ready',
  Convertable = 'Convertable',
  Working = 'working',
  Done = 'done',
  Error = 'error'
}

interface BatchPDFMakerProps {
  title?: string;
  tabs: RecycleTab[]
  onStateChange: (state: BatchConvertState) => void;
}

type ConvertTask = {
  status: ConvertState,
  tab: RecycleTab
  settings?: ConvertUpdateState['settings'];
  inherit: boolean
}

export type BatchPDFMakerRef = {
  convertAll: () => void
}

type BatchConvertEvents = {
  "stateUpdate": void
}

export const BatchPDFMaker = React.forwardRef<BatchPDFMakerRef, BatchPDFMakerProps>(function BatchPDFMaker({ title, tabs, onStateChange }: BatchPDFMakerProps, ref) {
  const [sourceList, setSourceList] = useState<ConvertTask[]>(() => tabs.map((t) => ({ status: ConvertState.Pending, tab: t, inherit: false })));
  const [selected, setSelected] = useState(sourceList[0]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [dragDisabled, setDragDisabled] = useState(true);
  const pdfMakerRef = useRef<PDFMakerRef>(null);
  const emitter = useMemo(() => mitt<BatchConvertEvents>(), []);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [currentState, setCurrentState] = useState<BatchConvertState>(BatchConvertState.Pending);
  useImperativeHandle(ref, () => {
    return {
      async convertAll() {
        const queue = new BatchConvertTaskQueue<Uint8Array | undefined>();
        sourceList.forEach((task) => {
          queue.add({
            taskId: task.tab.tabId,
            async exec() {
              // 因为当配置完其他tab的时候，他们的状态都是Convertable的，所以真正执行的时候，需要等iframe 加载成功
              if (selectedRef.current !== task && task.status === ConvertState.Convertable) {
                // reset task status
                task.status = ConvertState.Ready;
              }
              setSelected(task);
              const doConvert = async () => {
                task.status = ConvertState.Working;
                setSourceList([...sourceList]);
                try {
                  const result = await pdfMakerRef.current?.convert({
                    autoSave: false
                  });
                  task.status = ConvertState.Done;
                  return result;
                } catch (e) {
                  task.status = ConvertState.Error;
                  throw e;
                } finally {
                  setSourceList([...sourceList])
                }
              }
              if (task.status === ConvertState.Convertable) {
                await doConvert();
              } else {
                return new Promise<Uint8Array | undefined>((resolve) => {
                  const onStateUpdate = () => {
                    if (task.status === ConvertState.Convertable) {
                      emitter.off('stateUpdate', onStateUpdate);
                      resolve(doConvert());
                    }
                  }
                  emitter.on('stateUpdate', onStateUpdate);
                })
              }
            },
          });
        });
        setCurrentState(BatchConvertState.Working);
        try {
          const result = await queue.execAll();
          const data = await merge((result.filter(Boolean) as unknown as Uint8Array[]).map((r, i) => ({ pages: [r], title: sourceList[i].tab.title })), {
            emitOutline: true,
            emitPageNums: true,
            pageNumsColor: '#000000',
          });
          downloadBlob(data, `${title ?? 'rabbit_html2pdf_converter_' + Math.floor(Date.now() / 1000)}.pdf`, 'application/octet-stream');
        } catch (e) {
          console.error(e);
          setCurrentState(BatchConvertState.Interrupt);
          throw e;
        }
      },
    }
  }, [sourceList]);
  useEffect(() => {
    const ready = sourceList.every((item) => item.status === ConvertState.Ready || item.status === ConvertState.Convertable);
    const working = sourceList.some((item) => item.status === ConvertState.Working);
    const done = sourceList.every((item) => item.status === ConvertState.Done);
    if (done) {
      onStateChange(BatchConvertState.Done);
      return;
    }
    if (working) {
      onStateChange(BatchConvertState.Working);
      return
    }
    if (ready) {
      onStateChange(BatchConvertState.Ready);
    } else {
      onStateChange(BatchConvertState.Pending);
    }
  }, [sourceList]);
  useEffect(() => {
    return () => emitter.all.clear();
  }, [])
  return <div style={{ display: 'flex' }}>
    <div style={{ padding: 4, width: 260, boxSizing: 'border-box', border: '1px solid #ececec', borderRight: 'none', overflowY: 'auto' }}>
      <SortableList
        isDragDisabled={dragDisabled}
        recordKey={(data) => data.tab.tabId}
        render={(task) => <div
          onClick={() => {
            setSelected(task)
          }}
          style={{
            display: 'flex',
            padding: 4,
            lineHeight: '24px',
            background: task.tab.tabId === selected.tab.tabId ? '#ececec' : '#fff'
          }}
        >
          <div style={{ minWidth: 32, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'start' }}
            onMouseEnter={() => {
              setDragDisabled(false)
            }}
            onMouseLeave={() => {
              setDragDisabled(true)
            }}
          ><DragIndicator fontSize='small'></DragIndicator></div>
          <div
            style={{
              display: 'flex',
              minWidth: 0,
              flex: 1
            }}
          ><div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
          }}><div style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
          }}>{task.tab.title}</div></div>
            {
              !task.settings?.pageSettings?.targetElement ?
                <Tooltip title='Page settings unset' arrow><WarningOutlined fontSize='small' color='warning' style={{ marginTop: 4 }}></WarningOutlined></Tooltip>
                : <></>
            }
            {
              task.status === ConvertState.Working ? <Loading fontSize='small' style={{ marginTop: 4 }}></Loading> : <></>
            }
            {
              task.status === ConvertState.Done ? <Done fontSize="small" style={{ marginTop: 4 }} color='success'></Done> : <></>
            }
            {task.status === ConvertState.Error ? <IconButton size='small' onClick={() => {
              setRefreshFlag(((flag) => flag + 1))
            }}><Refresh fontSize="small" color='error'></Refresh></IconButton> : <></>}
            {sourceList.length > 1 ? <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                const index = sourceList.indexOf(task);
                if (index !== -1) {
                  sourceList.splice(index, 1);
                  if (selected === task) {
                    setSelected(sourceList[0]);
                  }
                  setSourceList([...sourceList]);
                }
              }}><Delete fontSize="small"></Delete></IconButton> : <></>}
          </div>
        </div>}
        value={sourceList}
        onChange={(v) => {
          setSourceList(v)
        }}></SortableList>
    </div>
    <PDFMaker
      ref={pdfMakerRef}
      autoScroll
      waiting={currentState === BatchConvertState.Working}
      applySameSettings
      key={`PDFMakert_${refreshFlag}_${selected.tab.url}`}
      src={selected.tab.url}
      settings={selected.settings}
      width={840}
      onUpdate={(state) => {
        selected.settings = state.settings;
        if (state.error) {
          selected.status = ConvertState.Error;
        } else if (selected.settings?.pageSettings?.targetElement) {
          selected.status = ConvertState.Ready;
        } else {
          selected.status = ConvertState.Pending;
        }
        if (selected.status === ConvertState.Ready && state.ready) {
          selected.status = ConvertState.Convertable;
        }
        setSourceList([...sourceList]);
        setTimeout(() => {
          emitter.emit('stateUpdate');
        }, 0);
      }}
      onApplySameSetings={(v) => {
        sourceList.forEach((s) => {
          if (similarityURL(selected.tab.url, s.tab.url)) {
            if ((s.settings && s.inherit) || !s.settings) {
              s.settings = cloneDeep(v);
              s.inherit = true;
              s.status = ConvertState.Ready
            }
          }
        })
        setSourceList([...sourceList]);
      }}
    ></PDFMaker>
  </div>
})