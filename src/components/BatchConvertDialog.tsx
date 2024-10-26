import React, { useRef, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { BatchConvertState, BatchPDFMaker, BatchPDFMakerRef } from './BatchPDFMaker';
import { hasFlags } from '@src/utils/flags';
import { RecycleTab } from '@src/model/recycle_tab';

interface BathcConvertDialogProps {
  onError?: (e: Error) => void;
  title?: string;
  tabs: RecycleTab[];
  children?: (setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode
}

export function BathcConvertDialog(props: BathcConvertDialogProps) {
  const [batchConvertState, setBatchConvertState] = useState(BatchConvertState.Pending);
  const batchPDFMakerRef = useRef<BatchPDFMakerRef>(null);
  return <ConfirmDialog title={"PDF Converter"}
    confirmText={hasFlags(batchConvertState, BatchConvertState.Fail) ? 'Close' : hasFlags(batchConvertState, BatchConvertState.Interrupted) ? "Continue" : "Convert All"}
    confirmTips={hasFlags(batchConvertState, BatchConvertState.Pending) ? 'Please set all page settings' : ''}
    confirmDisabled={hasFlags(batchConvertState, BatchConvertState.Pending)
      || hasFlags(batchConvertState, BatchConvertState.InProgress)
    }
    confirmLoading={hasFlags(batchConvertState, BatchConvertState.InProgress)}
    width={1100}
    content={<BatchPDFMaker
      onError={(e) => {
        props.onError?.(e)
      }}
      onStateChange={(state) => {
        setBatchConvertState(state);
      }}
      ref={batchPDFMakerRef}
      title={props.title}
      tabs={props.tabs}
    ></BatchPDFMaker>}
    onConfirm={async () => {
      if (hasFlags(batchConvertState, BatchConvertState.Fail)) {
        return;
      }
      if (hasFlags(batchConvertState, BatchConvertState.Interrupted)) {
        await batchPDFMakerRef.current?.continue();
      } else {
        await batchPDFMakerRef.current?.convertAll();
      }
    }}>
    {
      props.children
    }
  </ConfirmDialog>
}