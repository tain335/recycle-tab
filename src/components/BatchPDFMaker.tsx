import { RecycleTab } from '@src/model/recycle_tab';
import React, { useState } from 'react';
import { SortableList } from './SortableList';
import { Link } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';
import { PDFMaker } from './PDFMaker';

interface BatchPDFMakerProps {
  title: string;
  tabs: RecycleTab[]
}

export function BatchPDFMaker({ title, tabs }: BatchPDFMakerProps) {
  const [sourceList, setSourceList] = useState<RecycleTab[]>(tabs);
  const [selected, setSelected] = useState(sourceList[0]);
  const [dragDisabled, setDragDisabled] = useState(true);
  return <div style={{ display: 'flex' }}>
    <div style={{ padding: 4, width: 240, boxSizing: 'border-box', border: '1px solid #ececec', borderRight: 'none', overflowY: 'auto' }}>
      <SortableList
        isDragDisabled={dragDisabled}
        recordKey="tabId"
        render={(tab) => <div style={{ display: 'flex', padding: 4, lineHeight: '24px', background: tab.tabId === selected.tabId ? '#ececec' : '#fff' }}>
          <div style={{ flexBasis: 32, flexShrink: 0, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'start' }}
            onMouseEnter={() => {
              setDragDisabled(false)
            }}
            onMouseLeave={() => {
              setDragDisabled(true)
            }}
          ><DragIndicator fontSize='small'></DragIndicator></div>
          <div
            style={{ cursor: 'pointer', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}
          >{tab.title}</div>
        </div>}
        value={sourceList}
        onChange={(v) => {
          setSourceList(v)
        }}></SortableList>
    </div>
    <PDFMaker src={selected.url} width={760} onUpdate={() => { }}></PDFMaker>
  </div>
}