import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FrameMessages } from '@src/scripts/content-script';
import { CrossMessager } from '@src/messager/messager';
import { PDFMakerPageSettingsForm, PDFMakerConvertSettingsForm, PDFPageSettingsFormValue, PDFConvertSettingsFormValue } from './PDFMakerSettingsForm';
import { readBlobAsUint8Array } from '@src/utils/readBlobAsUint8Array';
import { useMemoRef } from '@src/hooks/useMemoRef';
import { Loading } from './Loading';
import { Error as ErrorIcon, KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight } from '@mui/icons-material';
import { Alert, Button, IconButton, Snackbar } from '@mui/material';
import { PageFormats } from 'web2pdf';
import { Form, FormItem } from './Form';
import { isFunction } from 'lodash';

interface PDFMakersSettings {
  pageSettings: PDFPageSettingsFormValue,
  convertSettings: PDFConvertSettingsFormValue,
}

export interface ConvertUpdateState {
  ready: boolean,
  error?: Error,
  settings: PDFMakersSettings,
  messager: CrossMessager<HostMessages, FrameMessages>
}

interface PDFMakerProps {
  applySameSettings?: boolean;
  autoScroll?: boolean;
  waiting?: boolean;
  waitingText?: string;
  width: number;
  height?: number;
  src: string;
  settings?: PDFMakersSettings,
  onUpdate: (state: ConvertUpdateState) => void
  onApplySameSetings?: (settings: PDFMakersSettings) => void;
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
  autoScroll: () => Promise<boolean>;
}

export interface LocalFont {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>
}

let localFonts: Record<string, LocalFont[]> = {};


function useControllableValue<T>(props: { value?: T, onChange?: (v: T) => void }, defaultValue?: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const controlled = useRef(!!props.value);
  if (controlled.current) {
    return [props.value as T, (v) => {
      if (isFunction(v)) {
        props.onChange?.(v(props.value as T));
      } else {
        props.onChange?.(v as T)
      }
    }, controlled.current];
  } else {
    // eslint-disable-next-line
    return [...useState<T>((props.value ?? defaultValue) as T), controlled.current]
  }
}

interface ConvertOpts {
  filename?: string, autoSave?: boolean
}

export interface PDFMakerRef {
  convert: (opts?: ConvertOpts) => Promise<Uint8Array>
}


// 页码
// 标题
export const PDFMaker = React.forwardRef<PDFMakerRef, PDFMakerProps>(function PDFMaker({
  src,
  width,
  height = document.body.clientHeight * 0.66,
  onUpdate,
  waiting,
  settings,
  waitingText,
  applySameSettings,
  autoScroll,
  onApplySameSetings
}: PDFMakerProps, ref) {
  const pannelWidth = 400;
  const pannelCollapseWidth = 36;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error>();
  const [collapse, setCollapse] = useState(false);
  const [pageSettings, setPageSettings, pageSettingsControlled] = useControllableValue<PDFPageSettingsFormValue>({
    value: settings?.pageSettings,
    onChange: (v) => {
      onUpdate({ ready, settings: { pageSettings: v, convertSettings }, messager });
    }
  },
    {
      window: {
        width: 1400,
        height,
      },
      scale: .6,
      selectAction: 'select',
      excludeElements: [],
      targetElement: null,
      scrollToEnd: true,
      title: '',
      loadEvent: 'dom_content_loaded',
      afterLoadEvent: 0,
    });
  const [convertSettings, setConvertSettings, convertSettingsControlled] = useControllableValue<PDFConvertSettingsFormValue>({
    value: settings?.convertSettings,
    onChange: (v) => {
      onUpdate({ ready, settings: { pageSettings, convertSettings: v }, messager });
    }
  },
    {
      defaultFont: 'PingFang SC',
      background: '#ffffff',
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
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
        async autoScroll() {
          return pageSettings.scrollToEnd
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
    onUpdate({ ready, settings: { pageSettings, convertSettings }, messager, error });
  }, [
    ready,
    error,
    !pageSettingsControlled ? pageSettings : undefined,
    !convertSettingsControlled ? convertSettings : undefined,
    messager
  ]);

  useEffect(() => {
    const callback: Parameters<typeof chrome.webNavigation.onDOMContentLoaded.addListener>[0] = async (details) => {
      const tab = await chrome.tabs.getCurrent();
      if (tab?.id === details.tabId && details.url === iframeRef.current?.src) {
        const frames = await chrome.webNavigation.getAllFrames({ tabId: tab?.id });
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
          // ???
          chrome.webNavigation.onDOMContentLoaded.removeListener(callback);
        }
      }
    };
    const errorCallback: Parameters<typeof chrome.webNavigation.onErrorOccurred.addListener>[0] = async (details) => {
      const tab = await chrome.tabs.getCurrent();
      if (tab?.id === details.tabId) {
        const frames = await chrome.webNavigation.getAllFrames({ tabId: tab?.id });
        if (frames?.length && frames[0].frameId === details.frameId) {
          setError(new Error(details.error))
          // onUpdate({ ready, settings: { pageSettings, printSettings }, messager, error: new Error(details.error) });
        }
      }
    }
    chrome.webNavigation.onErrorOccurred.addListener(errorCallback);
    chrome.webNavigation.onDOMContentLoaded.addListener(callback);
    return () => {
      chrome.webNavigation.onErrorOccurred.removeListener(errorCallback);
      chrome.webNavigation.onDOMContentLoaded.removeListener(callback);
    }
  }, []);

  useImperativeHandle(ref, () => {
    return {
      convert: async (opts?: ConvertOpts) => {
        await loadFonts();
        const fonts = getFonts()[convertSettings.defaultFont] ?? [];
        const loadedFontsData = await Promise.all(fonts.map(async (f) => {
          return await readBlobAsUint8Array(await f.blob())
        }));
        return await messager.send('convert', {
          defaultFonts: loadedFontsData,
          background: convertSettings.background,
          format: convertSettings.page.format,
          target: pageSettings.targetElement as Target,
          excludes: pageSettings.excludeElements,
          filename: opts?.filename,
          autoSave: opts?.autoSave,
        });
      }
    }
  }, [convertSettings, pageSettings, messager]);

  const buildOverlay = () => {
    if (error) {
      return <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.8)' }}>
        <div style={{ position: 'relative', right: collapse ? pannelCollapseWidth / 2 : pannelWidth / 2 }}><ErrorIcon style={{ verticalAlign: 'middle', marginRight: 4, }} color='error'></ErrorIcon><span style={{ fontSize: 14, verticalAlign: 'middle', color: 'red' }}>Error</span></div>
      </div>
    }
    if (!ready || waiting) {
      return <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.8)' }}>
        <div style={{ position: 'relative', right: collapse ? pannelCollapseWidth / 2 : pannelWidth / 2 }}><Loading style={{ verticalAlign: 'middle', marginRight: 4, }}></Loading><span style={{ fontSize: 14, verticalAlign: 'middle', color: '#666' }}>{waiting ? waitingText : ''}</span></div>
      </div>
    }
    return <></>
  }
  const iframeWidth = width - (collapse ? pannelCollapseWidth : pannelWidth);
  return <div style={{ position: 'relative', border: '1px solid #ececec', overflow: 'hidden' }}>
    <div style={{ position: 'relative', width: '100%', height: height, overflowX: ready ? 'auto' : 'hidden', overflowY: 'hidden' }}>
      <div style={{ width: width, paddingRight: pannelWidth, boxSizing: 'border-box' }}>
        <iframe ref={iframeRef}
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
      {buildOverlay()}
    </div>
    <div style={{
      transition: 'right .3s ease-in',
      position: 'absolute',
      right: collapse ? pannelCollapseWidth - pannelWidth : 0,
      top: 0,
      width: pannelWidth,
      height: height,
      boxSizing: 'border-box',
      paddingLeft: pannelCollapseWidth,
      background: '#ffffff',
      borderLeft: '1px solid #ececec',

    }}>
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <IconButton size='small' color='primary' onClick={() => {
          setCollapse(!collapse);
        }}>
          {collapse ? <KeyboardDoubleArrowLeft></KeyboardDoubleArrowLeft> : <KeyboardDoubleArrowRight fontSize='small'></KeyboardDoubleArrowRight>}
        </IconButton>
      </div>
      <div style={{ overflowY: 'auto', height: '100%', padding: '16px 16px 16px 0px' }}>
        <h3>Page Settings</h3>
        <PDFMakerPageSettingsForm
          autoScroll={autoScroll}
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
        <PDFMakerConvertSettingsForm
          localFonts={localFonts}
          value={convertSettings}
          onChange={(settings) => {
            setConvertSettings(settings);
          }}></PDFMakerConvertSettingsForm>
        {applySameSettings ? <Form labelWidth={140}>
          <FormItem label='Similarity Pages' style={{ marginTop: 4 }}>
            <Button
              size='small'
              variant="contained"
              style={{ marginRight: 30 }}
              disabled={!pageSettings.targetElement}
              onClick={() => {
                onApplySameSetings?.({ pageSettings, convertSettings });
                setMessageOpen(true);
              }}
            >Apply Same Settings</Button>
            <Snackbar
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              open={messageOpen}
              autoHideDuration={2000}
              onClose={() => {
                setMessageOpen(false);
              }}
            >
              <Alert
                severity="success"
                variant="filled"
                sx={{ width: '100%' }}
              >
                Apply success!
              </Alert>
            </Snackbar>
          </FormItem>
        </Form> : <></>}
      </div>
    </div>
  </div>
})

export async function loadFonts() {
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

export function getFonts() {
  return localFonts;
}