import React, { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@src/components/ConfirmDialog';
import { PDFMaker, PDFMakerRef, ConvertUpdateState, loadFonts } from '@src/components/PDFMaker';
import { useCrossMessage } from '@src/hooks/useCrossMessage';
import { MessageType } from '@src/constants/constants';

export function ConvertPageDialog() {
  const [converting, setConverting] = React.useState(false);
  const [convertState, setConvertState] = useState<ConvertUpdateState>();
  const pdfMakerRef = useRef<PDFMakerRef>(null);
  const [visible, setVisible] = useState(false);
  const message = useCrossMessage(MessageType.ShowConverter);
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
        throw err
      } finally {
        setConverting(false)
      }
    }}
    content={<PDFMaker
      key={url}
      ref={pdfMakerRef}
      waiting={converting}
      waitingText="Converting..."
      src={url}
      width={1100}
      onUpdate={(state) => {
        setConvertState(state);
      }}></PDFMaker>}>
    {() => <></>}
  </ConfirmDialog>
}