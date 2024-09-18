import React, { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@src/components/ConfirmDialog';
import { PDFMaker, PDFMakerRef, PrintUpdateState, loadFonts } from '@src/components/PDFMaker';
import { useCrossMessage } from '@src/hooks/useCrossMessage';
import { MessageType } from '@src/constants/constants';

export function PrintPageDialog() {
  const [printing, setPrinting] = React.useState(false);
  const [printState, setPrintState] = useState<PrintUpdateState>();
  const pdfMakerRef = useRef<PDFMakerRef>(null);
  const [visible, setVisible] = useState(false);
  const message = useCrossMessage(MessageType.ShowPrinter);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (message) {
      (async () => {
        await loadFonts();
        setUrl(message);
        setVisible(true);
      })();
    }
  }, [message])

  return <ConfirmDialog
    width='100%'
    open={visible}
    onClose={() => {
      setUrl('');
      setVisible(false);
    }}
    title={"PDF Maker"}
    confirmText="Print"
    confirmLoading={printing}
    confirmDisabled={!printState?.settings.pageSettings.targetElement || printing}
    onConfirm={async () => {
      try {
        if (!printState?.settings.pageSettings.targetElement) {
          return;
        }
        setPrinting(true);
        await pdfMakerRef.current?.print();
      } catch (err) {
        throw err
      } finally {
        setPrinting(false)
      }
    }}
    content={<PDFMaker
      key={url}
      ref={pdfMakerRef}
      waiting={printing}
      waitingText="Printing..."
      src={url}
      width={1100}
      onUpdate={(state) => {
        setPrintState(state);
      }}></PDFMaker>}>
    {() => <></>}
  </ConfirmDialog>
}