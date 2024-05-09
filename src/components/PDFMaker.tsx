import React, { useEffect, useRef, useState } from 'react';
import { FrameMessages } from '@src/scripts/content-script';
import { CrossMessager } from '@src/messager/messager';
import { PDFMakerPageSettingsForm, PDFMakerPrintSettingsForm, PDFPageSettingsFormValue, PDFPrintSettingsFormValue } from './PDFMakerSettingsForm';
import { readBlobAsUint8Array } from '@src/utils/readBlobAsUint8Array';
import { useMemoRef } from '@src/hooks/useMemoRef';
import { Loading } from './Loading';
import { KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { PageFormats } from 'web2pdf';

export interface PrintUpdateState {
  ready: boolean,
  pageSettings: PDFPageSettingsFormValue,
  printSettings: PDFPrintSettingsFormValue,
  messager: CrossMessager<HostMessages, FrameMessages>
}

interface PDFMakerProps {
  waiting?: boolean;
  waitingText?: string;
  width: number;
  height?: number;
  src: string;
  onUpdate: (state: PrintUpdateState) => void
}

export type Target = { id: string, selector: string };

export type ResolvedFontResult = { resolvedFonts: { [name: string]: Uint8Array[] }, unkownFontFamiles: string[] };

export interface HostMessages {
  exclude: (params: Target[]) => void
  getExcludes: () => Promise<Target[]>
  target: (params: Target | null) => void
  getTarget: () => Promise<Target | null>
  ready: (params?: string[]) => void
  resolveFonts: (params: string[]) => Promise<ResolvedFontResult>;
  getAction: () => Promise<string>
}

export interface LocalFont {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>
}

let localFonts: Record<string, LocalFont[]> = {};

PDFMaker.loadFonts = async () => {
  try {
    // @ts-ignore
    let fonts: LocalFont[] = await window.queryLocalFonts();
    localFonts = {};
    fonts.forEach((f) => {
      if (!localFonts[f.family]) {
        localFonts[f.family] = [];
      }
      localFonts[f.family].push(f);
    })
  } catch (err) {
    return Promise.reject(err);
  }
  return Promise.resolve()
}

PDFMaker.getFonts = () => {
  return localFonts;
}
// 页码
// 标题
export function PDFMaker({ src, width, height = document.body.clientHeight * 0.66, onUpdate, waiting, waitingText }: PDFMakerProps) {
  const pannelWidth = 400;
  const pannelCollapseWidth = 36;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [collapse, setCollapse] = useState(false);
  const [pageSettings, setPageSettings] = useState<PDFPageSettingsFormValue>({
    window: {
      width: 1400,
      height,
    },
    scale: .6,
    selectAction: 'select',
    excludeElements: [],
    targetElement: null
  });
  const [printSettings, setPrintSettings] = useState<PDFPrintSettingsFormValue>({
    defaultFont: 'PingFang SC',
    background: '#ffffff',
    page: {
      format: 'a4',
      size: {
        width: PageFormats['a4'][0],
        height: PageFormats['a4'][1],
      }
    }
  })
  const messager: CrossMessager<HostMessages, FrameMessages> = useMemoRef((oldMessager) => {
    const register = (msger: CrossMessager<HostMessages, FrameMessages>) => {
      msger.registerReceiveActions({
        ready: () => {
          setReady(true);
        },
        exclude: (params) => {
          setPageSettings((settings) => ({ ...settings, excludeElements: params }))
        },
        async getExcludes() {
          return pageSettings.excludeElements
        },
        target: (params) => {
          setPageSettings((settings) => ({ ...settings, targetElement: params }));
        },
        async getTarget() {
          return Promise.resolve(pageSettings.targetElement)
        },
        async resolveFonts(fontFamilies) {
          const resolvedFontsPromises: { [name: string]: Promise<Uint8Array>[] } = {}
          const resolvedFonts: { [name: string]: Uint8Array[] } = {}
          const unkownFontFamiles: Set<string> = new Set();
          for (let i = 0; i < fontFamilies.length; i++) {
            let fontFamily = fontFamilies[i];
            const fonts = fontFamily.split(',').map((item) => item.replaceAll("\"", "").trim())
            for (let j = 0; j < fonts.length; j++) {
              let f = fonts[j];
              if (localFonts[f]) {
                if (!resolvedFontsPromises[f]) {
                  resolvedFontsPromises[f] = localFonts[f].map(async (font) => readBlobAsUint8Array(await font.blob()));
                }
              } else {
                unkownFontFamiles.add(f);
              }
            }
          }
          const fontNames = Object.keys(resolvedFontsPromises);
          for (let i = 0; i < fontNames.length; i++) {
            resolvedFonts[fontNames[i]] = await Promise.all(resolvedFontsPromises[fontNames[i]])
          }
          return { resolvedFonts, unkownFontFamiles: Array.from(unkownFontFamiles.values()) }
        },
        async getAction() {
          return pageSettings.selectAction
        }
      });
    }
    if (oldMessager) {
      register(oldMessager);
      return oldMessager;
    }
    const newMsger = new CrossMessager<HostMessages, FrameMessages>((message) => {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
    });
    register(newMsger);
    return newMsger;
  }, [pageSettings]);

  useEffect(() => {
    return () => {
      messager.dispose();
    }
  }, []);

  useEffect(() => {
    onUpdate({ ready, pageSettings, printSettings, messager });
  }, [ready, pageSettings, printSettings, messager]);

  const onload = async () => {
    chrome.tabs.getCurrent(async (tab) => {
      if (tab?.id) {
        const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id })
        if (frames?.length) {
          try {
            await chrome.scripting.executeScript({
              target: {
                tabId: tab.id ?? 0,
                frameIds: [frames[0].frameId],
              },
              files: ["content-script.bundle.js"]
            });
          } catch (err) {
            console.error(err);
          }
        }
      }
    })
  }
  const iframeWidth = width - (collapse ? pannelCollapseWidth : pannelWidth);
  return <div style={{ position: 'relative', border: '1px solid #ececec', overflow: 'hidden' }}>
    <div style={{ position: 'relative', width: '100%', height: height, overflowX: ready ? 'auto' : 'hidden', overflowY: 'hidden' }}>
      <div style={{ width: width, paddingRight: pannelWidth, boxSizing: 'border-box' }}>
        <iframe onLoad={onload} ref={iframeRef}
          style={{
            transition: 'transform .3s ease-in',
            transform: `translateX(${pageSettings.window.width * pageSettings.scale < iframeWidth ? (iframeWidth - pageSettings.window.width * pageSettings.scale) / 2 : 0}px) scale(${pageSettings.scale})`,
            transformOrigin: 'left 0px',
            width: pageSettings.window.width,
            height: pageSettings.window.height * (1 / pageSettings.scale),
            border: 'none'
          }}
          src={src} title='PDF Maker'></iframe>
      </div>
      {!ready || waiting ? <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.8)' }}>
        <div style={{ position: 'relative', right: collapse ? pannelCollapseWidth / 2 : pannelWidth / 2 }}><Loading style={{ verticalAlign: 'middle' }}></Loading><span style={{ fontSize: 14, verticalAlign: 'middle', color: '#666' }}>{waiting ? waitingText : ''}</span></div>
      </div> : <></>}
    </div>
    <div style={{
      transition: 'right .3s ease-in',
      position: 'absolute',
      right: collapse ? pannelCollapseWidth - pannelWidth : 0,
      top: 0,
      width: pannelWidth,
      height: height,
      boxSizing: 'border-box',
      padding: 16,
      paddingLeft: pannelCollapseWidth,
      background: '#ffffff',
      borderLeft: '1px solid #ececec'
    }}>
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <IconButton size='small' color='primary' onClick={() => {
          setCollapse(!collapse);
        }}>
          {collapse ? <KeyboardDoubleArrowLeft></KeyboardDoubleArrowLeft> : <KeyboardDoubleArrowRight fontSize='small'></KeyboardDoubleArrowRight>}
        </IconButton>
      </div>
      <h3>Page Settings</h3>
      <PDFMakerPageSettingsForm
        value={pageSettings}
        onChange={(settings) => {
          setPageSettings(settings)
        }}
        onHighlight={(target) => {
          messager.send('highlight', target);
        }}
        onDeleteTarget={(index, target) => {
          pageSettings.targetElement = null;
          setPageSettings({ ...pageSettings });
          messager.send('removeTarget', target);
        }}
        onDeleteExclude={(index, target) => {
          pageSettings.excludeElements.splice(index, 1);
          setPageSettings({ ...pageSettings });
          messager.send('removeExcludes', [target]);
        }}
      ></PDFMakerPageSettingsForm>
      <h3>PDF Settings</h3>
      <PDFMakerPrintSettingsForm localFonts={localFonts} value={printSettings} onChange={(settings) => {
        setPrintSettings(settings);
      }}></PDFMakerPrintSettingsForm>
    </div>
  </div>
}