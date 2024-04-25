import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import { FrameMessages } from '@src/scripts/content-script';
import { CrossMessager } from '@src/messager/messager';
import { PDFMakerPageSettingsForm, PDFMakerPrintSettingsForm, PDFPageSettingsFormValue, PDFPrintSettingsFormValue } from './PDFMakerSettingsForm';
import { readBlobAsUint8Array } from '@src/utils/readBlobAsUint8Array';
import { useMemoRef } from '@src/hooks/useMemoRef';

interface PDFMakerProps {
  width?: number;
  height?: number;
  src: string;
}

export type Target = { id?: string, selector: string };

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
// 页码
// 标题
export function PDFMaker({ src, width, height = document.body.clientHeight * 0.66 }: PDFMakerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [pageSettings, setPageSettings] = useState<PDFPageSettingsFormValue>({
    window: {
      width: 1400,
      height,
    },
    scale: 1,
    selectAction: 'select',
    excludeElements: [],
    targetElement: null
  });
  const [printSetings, setPrintSettings] = useState<PDFPrintSettingsFormValue>({
    defaultFont: 'PingFang SC',
    background: '#ffffff',
    page: {
      format: 'a4',
      size: {
        width: 0,
        height: 0
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
  }, [])
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
  return <div style={{ position: 'relative', border: '1px solid #ececec' }}>
    <div style={{ width: '100%', height: height, overflowX: 'auto' }}>
      <div style={{ width: width, paddingRight: 360, boxSizing: 'border-box' }}>
        <iframe onLoad={onload} ref={iframeRef}
          style={{
            transform: `scale(${pageSettings.scale}) translateX(${pageSettings.window.width * pageSettings.scale < 840 ? 840 - pageSettings.window.width * pageSettings.scale : 0}px)`,
            transformOrigin: 'left 0px',
            width: pageSettings.window.width,
            height: pageSettings.window.height * (1 / pageSettings.scale), border: 'none'
          }}
          src={src} title='PDF Maker'></iframe>
      </div>
    </div>
    <div style={{ position: 'absolute', right: 0, top: 0, width: 360, height: height, boxSizing: 'border-box', padding: 20, background: '#ffffff', borderLeft: '1px solid #ececec' }}>
      <h3>Page Settings</h3>
      <PDFMakerPageSettingsForm value={pageSettings} onChange={(settings) => {
        setPageSettings(settings)
      }}></PDFMakerPageSettingsForm>
      <h3>PDF Settings</h3>
      <PDFMakerPrintSettingsForm localFonts={localFonts} value={printSetings} onChange={(settings) => {
        setPrintSettings(settings);
      }}></PDFMakerPrintSettingsForm>
      <Button disabled={!ready} onClick={async () => {
        if (!pageSettings.targetElement) {
          return;
        }
        const fonts = localFonts[printSetings.defaultFont] ?? [];
        const loadedFontsData = await Promise.all(fonts.map(async (f) => {
          return await readBlobAsUint8Array(await f.blob())
        }));
        messager.send('print', {
          defaultFonts: loadedFontsData,
          format: printSetings.page.format,
          target: pageSettings.targetElement,
          excludes: pageSettings.excludeElements
        });
      }}>Print</Button>
    </div>
  </div>
}