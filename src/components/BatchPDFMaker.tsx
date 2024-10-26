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
import { hasFlags } from '@src/utils/flags';

export enum BatchConvertState {
  Pending = 1,
  Ready = 2,
  Converting = 4,
  Converted = 8,
  Done = 16,
  Fail = 32,
  InProgress = 64, // 标记位
  Interrupted = 128 // 标记位
}

export enum ConvertState {
  Pending = 'pending', // 参数没有准备好
  Prepared = 'prepared', // 所有参数已经准备好
  WaitForReady = 'wait_for_ready', // 在队列中，但是等待iframe加载
  WaitForConvertable = 'wait_for_convertable', // 在工作队列中，iframe加载完成，准备进行转换
  Convertable = 'convertable', // 可以准备开始转换
  Converting = 'converting', // 正在转换中
  Done = 'done', // 转换成功
  Error = 'error' // 加载错误或者转换错误
}

interface BatchPDFMakerProps {
  title?: string;
  tabs: RecycleTab[]
  onStateChange: (state: BatchConvertState) => void;
  onError?: (e: Error) => void;
}

type ConvertTask = {
  status: ConvertState,
  tab: RecycleTab
  settings?: ConvertUpdateState['settings'];
  inherit: boolean
}

export type BatchPDFMakerRef = {
  convertAll: () => void
  continue: () => void
}

type BatchConvertEvents = {
  "stateUpdate": void
}

export const BatchPDFMaker = React.forwardRef<BatchPDFMakerRef, BatchPDFMakerProps>(function BatchPDFMaker({ title, tabs, onStateChange, onError }: BatchPDFMakerProps, ref) {
  const [sourceList, setSourceList] = useState<ConvertTask[]>(() => tabs.map((t) => ({ status: ConvertState.Pending, tab: t, inherit: false })));
  const [selected, setSelected] = useState<ConvertTask | null>(sourceList[0]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [dragDisabled, setDragDisabled] = useState(true);
  const pdfMakerRef = useRef<PDFMakerRef>(null);
  const emitter = useMemo(() => mitt<BatchConvertEvents>(), []);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentState, setCurrentState] = useState<BatchConvertState>(BatchConvertState.Pending);
  const queue = useRef(new BatchConvertTaskQueue<Uint8Array | undefined>());
  useImperativeHandle(ref, () => {
    return {
      async convertAll() {
        queue.current = new BatchConvertTaskQueue<Uint8Array | undefined>();
        sourceList.forEach((task) => {
          if (task.status === ConvertState.Done) {
            task.status = ConvertState.Prepared;
          }
          queue.current.add({
            taskId: task.tab.id,
            async exec() {
              // 因为当配置完其他tab的时候，他们的状态都是Prepared的，所以真正执行的时候，需要等iframe 加载成功
              if (task.status === ConvertState.Prepared) {
                // reset task status
                task.status = ConvertState.WaitForReady;
                setSelected(task);
              }
              const doConvert = async () => {
                task.status = ConvertState.Converting;
                setSourceList([...sourceList])
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
                return await doConvert();
              } else {
                return new Promise<Uint8Array | undefined>((resolve, reject) => {
                  const onStateUpdate = () => {
                    if (task.status === ConvertState.Convertable || task.status === ConvertState.WaitForConvertable) {
                      emitter.off('stateUpdate', onStateUpdate);
                      resolve(doConvert());
                    } else if (task.status === ConvertState.Error) {
                      emitter.off('stateUpdate', onStateUpdate);
                      reject(new Error('interrupr error'));
                    }
                  }
                  emitter.on('stateUpdate', onStateUpdate);
                });
              }
            },
          });
        });
        setCurrentState(BatchConvertState.Converting | BatchConvertState.InProgress);
        emitter.off('stateUpdate');
        try {
          const result = await queue.current.execAll();
          setCurrentState(BatchConvertState.Converted | BatchConvertState.InProgress);
          const data = await merge((result.filter(Boolean) as unknown as Uint8Array[]).map((r, i) => ({ pages: [r], title: sourceList[i].tab.title })), {
            emitOutline: true,
            emitPageNums: false,
            pageNumsColor: '#000000',
          });
          queue.current.destroy();
          downloadBlob(data, `${title ?? 'rabbit_html2pdf_converter_' + Math.floor(Date.now() / 1000)}.pdf`, 'application/octet-stream');
          setCurrentState(BatchConvertState.Done);
        } catch (e) {
          console.error(e);
          onError?.(e as unknown as Error);
          setCurrentState((currentState) => {
            if (hasFlags(currentState, BatchConvertState.Converted)) {
              return BatchConvertState.Fail
            } else {
              return BatchConvertState.Pending | BatchConvertState.Interrupted
            }
          });
          throw e;
        }
      },
      async continue() {
        setCurrentState(BatchConvertState.Converting | BatchConvertState.Interrupted | BatchConvertState.InProgress);
        emitter.off('stateUpdate');
        try {
          const result = await queue.current.continue();
          setCurrentState(BatchConvertState.Converted | BatchConvertState.InProgress);
          const data = await merge((result.filter(Boolean) as unknown as Uint8Array[]).map((r, i) => ({ pages: [r], title: sourceList[i].tab.title })), {
            emitOutline: true,
            emitPageNums: false,
            pageNumsColor: '#000000',
          });
          queue.current.destroy();
          downloadBlob(data, `${title ?? 'rabbit_html2pdf_converter_' + Math.floor(Date.now() / 1000)}.pdf`, 'application/octet-stream');
          setCurrentState(BatchConvertState.Done);
        } catch (e) {
          console.error(e);
          onError?.(e as unknown as Error);
          setCurrentState((currentState) => {
            if (hasFlags(currentState, BatchConvertState.Converted)) {
              return BatchConvertState.Fail
            } else {
              return BatchConvertState.Pending | BatchConvertState.Interrupted
            }
          });
          throw e;
        }
      },
    }
  }, [sourceList]);

  useEffect(() => {
    // console.log('sourceList', sourceList);
    const isReady = sourceList.every((item) => item.status !== ConvertState.Pending && item.status !== ConvertState.Error);
    if (isReady && hasFlags(currentState, BatchConvertState.Pending)) {
      if (hasFlags(currentState, BatchConvertState.Interrupted)) {
        setCurrentState(BatchConvertState.Ready | BatchConvertState.Interrupted);
      } else {
        setCurrentState(BatchConvertState.Ready);
      }
    }
    if (!isReady && !hasFlags(currentState, BatchConvertState.InProgress)) {
      if (hasFlags(currentState, BatchConvertState.Interrupted)) {
        setCurrentState(BatchConvertState.Pending | BatchConvertState.Interrupted);
      } else {
        setCurrentState(BatchConvertState.Pending);
      }
    }
  }, [sourceList]);

  useEffect(() => {
    onStateChange(currentState);
  }, [currentState])

  useEffect(() => {
    return () => emitter.all.clear();
  }, []);

  return <div style={{ display: 'flex' }}>
    <div style={{ padding: 4, width: 260, boxSizing: 'border-box', border: '1px solid #ececec', borderRight: 'none', overflowY: 'auto' }}>
      <SortableList
        isDragDisabled={hasFlags(currentState, BatchConvertState.Interrupted) || dragDisabled}
        recordKey={(data) => data.tab.id}
        render={(task) => <div
          onClick={() => {
            if (!hasFlags(currentState, BatchConvertState.InProgress) && !hasFlags(currentState, BatchConvertState.Interrupted)) {
              setSelected(task)
            }
          }}
          style={{
            display: 'flex',
            cursor: (!hasFlags(currentState, BatchConvertState.InProgress) && !hasFlags(currentState, BatchConvertState.Interrupted)) ? 'pointer' : 'not-allowed',
            padding: 4,
            lineHeight: '24px',
            background: task.tab.id === selected?.tab.id ? '#ececec' : '#fff'
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
              task.status === ConvertState.Converting || task.status === ConvertState.WaitForReady || task.status === ConvertState.WaitForConvertable
                ? <Loading fontSize='small' style={{ marginTop: 4 }}></Loading> : <></>
            }
            {
              task.status === ConvertState.Done ? <Done fontSize="small" style={{ marginTop: 4 }} color='success'></Done> : <></>
            }
            {task.status === ConvertState.Error ? <Tooltip title="Refresh Current Page" arrow placement="top"><IconButton size='small' onClick={() => {
              setRefreshKey(((key) => key + 1));
            }}><Refresh fontSize="small" color='error'></Refresh></IconButton></Tooltip> : <></>}
            {sourceList.length > 1 ? <IconButton disabled={hasFlags(currentState, BatchConvertState.InProgress) || task.status === ConvertState.Done}
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                const index = sourceList.indexOf(task);
                if (index !== -1) {
                  sourceList.splice(index, 1);
                  if (selected === task) {
                    setSelected(sourceList[0]);
                  }
                  queue.current.remove(task.tab.id);
                  setSourceList([...sourceList]);
                }
              }}><Delete fontSize="small"></Delete></IconButton> : <></>}
          </div>
        </div>}
        value={sourceList}
        onChange={(v) => {
          setSourceList(v)
        }}></SortableList>
    </div >
    <PDFMaker
      ref={pdfMakerRef}
      autoScroll
      waiting={hasFlags(currentState, BatchConvertState.InProgress)}
      applySameSettings
      key={`PDFMakert_${refreshKey}_${selected?.tab.url}`}
      src={selected?.tab.url ?? ''}
      settings={selected?.settings}
      width={840}
      onUpdate={(state) => {
        if (selected) {
          selected.settings = state.settings;
          // 如果是等待iframe加载只需要关注error事件和ready状态就好
          if (selected.status === ConvertState.WaitForReady) {
            if (state.error) {
              selected.status = ConvertState.Error;
            }
            if (selected.status === ConvertState.WaitForReady && state.ready) {
              selected.status = ConvertState.WaitForConvertable;
            }
          } else if (selected.status !== ConvertState.Done) {
            if (state.error) {
              selected.status = ConvertState.Error;
            } else if (selected.settings?.pageSettings?.targetElement) {
              selected.status = ConvertState.Prepared;
            } else {
              selected.status = ConvertState.Pending;
            }
            if (selected.status === ConvertState.Prepared && state.ready) {
              selected.status = ConvertState.Convertable;
            }
          }
        }
        setSourceList([...sourceList])
        setTimeout(() => {
          emitter.emit('stateUpdate');
        }, 0);
      }}
      onApplySameSetings={(v) => {
        sourceList.forEach((s) => {
          if (s.status !== ConvertState.Done && selected && similarityURL(selected.tab.url, s.tab.url)) {
            if ((s.settings && s.inherit) || !s.settings) {
              s.settings = cloneDeep(v);
              s.inherit = true;
              s.status = ConvertState.Prepared
            }
          }
        })
        setSourceList([...sourceList]);
      }}
    ></PDFMaker>
  </div >
})