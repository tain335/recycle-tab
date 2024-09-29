import { web2pdf } from 'web2pdf/dist/cjs';
import { CrossMessager } from "@src/messager/messager";
import { HostMessages, Target } from '@src/components/PDFMaker';
import { PageFomat } from 'web2pdf/dist/pagebreak';
import { nanoid } from 'nanoid';

declare global {
  interface Window {
    __PDFMAKERT_INITED__: boolean;
  }
}

const TargetColor = '#52c41a';
const ExcludeColor = 'red';
const HoverColor = '#1890ff';

var messager: CrossMessager<FrameMessages, HostMessages>;
var observer: MutationObserver;

// TODO html2canvas 解释样式错误，错误提示，printing动画
export interface FrameMessages {
  convert: (params: {
    defaultFonts: Uint8Array[],
    format?: string,
    target: Target,
    background?: string,
    excludes: Target[],
    autoSave?: boolean
    filename?: string;
  }) => Promise<Uint8Array>
  removeExcludes: (params: Target[]) => Promise<void>;
  removeTarget: (params: Target) => Promise<void>;
  highlight: (params?: Target) => Promise<void>;
}

function initMessager(): CrossMessager<FrameMessages, HostMessages> {
  return new CrossMessager<FrameMessages, HostMessages>((message) => {
    window.top?.postMessage(message, '*');
  });
}

function getElOffset(el: HTMLElement) {
  const bodyRect = document.body.getBoundingClientRect();
  const elemRect = el.getBoundingClientRect();
  const offsetTop = elemRect.top - bodyRect.top;
  const offsetLeft = elemRect.left - bodyRect.left;
  return {
    offsetTop,
    offsetLeft
  }
}

function createOverlayFromEl(id: string, el: HTMLElement, color: string) {
  const selectDiv = document.createElement('div');
  const { offsetTop, offsetLeft } = getElOffset(el);
  if (selectDiv) {
    const width = el.clientWidth;
    const height = el.clientHeight;
    selectDiv.id = id;
    selectDiv.className = "pdf_selector_overlay";
    // @ts-ignore
    selectDiv.style = `position: absolute; pointer-events: none; z-index: 9999; top: ${offsetTop}px; left: ${offsetLeft}px; width: ${width}px; height: ${height}px; background: ${color}; opacity: 0.5`
    document.body.append(selectDiv);
  }
}

function initEvents(messager: CrossMessager<FrameMessages, HostMessages>) {
  let lastHighlightTarget: Target | null = null;
  let lastTargetColor: string = '';
  function collectElFontFamiles(el: HTMLElement) {
    var fontFamilies = new Map()
    const allElements = el.querySelectorAll('*');
    allElements.forEach(function (element) {
      // 获取元素的计算样式
      var computedStyle = window.getComputedStyle(element);
      // 获取元素的字体族
      var fontFamily = computedStyle.fontFamily;
      // 检查字体族是否已加载
      if (!fontFamilies.has(fontFamily)) {
        fontFamilies.set(fontFamily, true);
      }
    });
    return Array.from(fontFamilies.keys());
  }
  messager.registerReceiveActions({
    async convert(params) {
      const el = document.querySelector(params.target.selector);
      if (el) {
        await waitForScroll();
        const excludeElements = params.excludes.map((item) => document.querySelector(item.selector)).filter(Boolean) as Element[];
        const fontFamilies = collectElFontFamiles(el as HTMLElement);
        const result = await messager.send('resolveFonts', fontFamilies);
        observer.disconnect();
        return await web2pdf(el as HTMLElement, {
          autoDownload: params.autoSave ?? true,
          defaultFonts: params.defaultFonts,
          fonts: result.resolvedFonts,
          margin: [20, 10],
          background: params.background ?? '#ffffff',
          format: params.format as PageFomat,
          fileName: params.filename,
          ignoreElements: excludeElements,
        });
      } else {
        throw new Error('cannot found element');
      }
    },
    async removeExcludes(params) {
      params.forEach((p) => {
        const div = document.getElementById(p.id ?? '');
        if (div) {
          document.body.removeChild(div);
        }
      })
    },
    async removeTarget(params) {
      const div = document.getElementById(params.id ?? '');
      if (div) {
        document.body.removeChild(div);
      }
    },
    async highlight(params) {
      if (lastHighlightTarget) {
        const div = document.getElementById(lastHighlightTarget.id ?? '');
        if (div) {
          div.style.backgroundColor = lastTargetColor;
        }
      }
      if (params) {
        lastHighlightTarget = params;
        const div = document.getElementById(params.id ?? '');
        if (div) {
          lastTargetColor = div.style.backgroundColor ?? '';
          div.style.backgroundColor = 'orange';
        }
      }
    },
  })


  function getElSelector(el: HTMLElement): string {
    if (el.tagName.toLowerCase() === "html")
      return "HTML";
    let str = el.tagName;
    if (el.id) {
      str += (el.id !== "") ? "#" + el.id : "";
    } else if (el.className) {
      const classes = el.className.split(/\s/).filter(Boolean);
      for (var i = 0; i < classes.length; i++) {
        str += "." + classes[i]
      }
    }
    if (el.parentElement) {
      const children = el.parentElement.querySelectorAll(str);
      if (children.length > 1) {
        return getElSelector(el.parentElement) + " > :nth-child(" + (Array.from(el.parentElement.children).indexOf(el) + 1) + ")"
      } else {

        return getElSelector(el.parentElement) + " > " + str;
      }
    }
    return str;
  }

  const PDF_OVERLAY = 'pdf_overlay';
  document.body.addEventListener('click', async (event) => {
    const overlay = document.getElementById(PDF_OVERLAY);
    if (overlay) {
      const width = overlay.clientWidth;
      const height = overlay.clientHeight;
      const { offsetTop, offsetLeft } = getElOffset(overlay);
      if (event.pageX >= offsetLeft && event.pageX <= offsetLeft + width && event.pageY >= offsetTop && event.pageY <= offsetTop + height) {
        event.stopPropagation();
        event.preventDefault();
        const id = nanoid();
        const selectDivId = 'pdf_selector_' + id;
        const selector = getElSelector(event.target as HTMLElement);
        const action = await messager.send('getAction');
        let addNew = false;
        if (action === 'select') {
          const oldTarget = await messager.send('getTarget');
          if (oldTarget) {
            const div = document.getElementById(oldTarget.id ?? '')
            if (div) {
              document.body.removeChild(div);
            }
          }
          if (oldTarget?.selector !== selector) {
            addNew = true;
            messager.send('target', { id: selectDivId, selector: selector });
          }
        } else {
          const excludes = await messager.send('getExcludes');
          const index = excludes.findIndex((item) => item.selector === selector);
          if (index !== -1) {
            const [delTarget] = excludes.splice(index, 1);
            const div = document.getElementById(delTarget.id ?? '');
            if (div) {
              document.body.removeChild(div);
            }
          } else {
            excludes.push({ id: selectDivId, selector: selector })
            addNew = true;
          }
          messager.send('exclude', excludes)
        }
        if (addNew) {
          const overlay = document.getElementById(PDF_OVERLAY);
          if (overlay) {
            createOverlayFromEl(selectDivId, overlay, action === 'select' ? TargetColor : ExcludeColor);
          }
        }
      }
    }
  }, false);

  window.document.body.addEventListener('mouseleave', () => {
    let div = document.getElementById(PDF_OVERLAY);
    if (div) {
      document.body.removeChild(div);
    }
  }, false);

  window.document.body.addEventListener('mousemove', (event) => {
    const el = event.target as HTMLElement;
    const width = el.clientWidth;
    const height = el.clientHeight;
    const { offsetLeft, offsetTop } = getElOffset(el);
    let div = document.getElementById(PDF_OVERLAY);
    let exist = Boolean(div);
    if (!exist) {
      div = document.createElement('div');
      div.id = PDF_OVERLAY;
    }
    // @ts-ignore
    div.style = `position: absolute; pointer-events: none; z-index: 9999; top: ${offsetTop}px; left: ${offsetLeft}px; width: ${width}px; height: ${height}px; background: ${HoverColor}; opacity: 0.5`;
    if (!exist && div) {
      document.body.append(div);
    }
  });

  // @ts-ignore
  navigation.addEventListener('navigate', () => {
    messager.send('target', null);
    messager.send('exclude', []);
    Array.from(document.querySelectorAll('.pdf_selector_overlay')).forEach((item) => item.remove());
  });
}

async function syncSettings(messager: CrossMessager<FrameMessages, HostMessages>) {
  const target = await messager.send('getTarget');
  const excludes = await messager.send('getExcludes');
  if (target) {
    const existed = document.getElementById(target.id);
    if (existed) {
      document.body.removeChild(existed);
    }
    let el = document.querySelector(target.selector) as HTMLElement;
    if (el) {
      createOverlayFromEl(target.id, el, TargetColor);
    }
  }
  if (excludes) {
    try {
      excludes.forEach((e) => {
        const existed = document.getElementById(e.id);
        if (existed) {
          document.body.removeChild(existed);
        }
        let el = document.querySelector(e.selector) as HTMLElement;
        if (el) {
          createOverlayFromEl(e.id, el, ExcludeColor);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}

async function initSettings(messager: CrossMessager<FrameMessages, HostMessages>) {
  syncSettings(messager);
  observer = new MutationObserver((mutationList) => {
    let needSync = false;
    for (const mutation of mutationList) {
      if (mutation.addedNodes) {
        // eslint-disable-next-line
        Array.from(mutation.addedNodes).forEach((node) => {
          if (!(node instanceof HTMLElement && node.classList.contains('pdf_selector_overlay'))) {
            needSync = true;
          }
        })
      } else if (mutation.removedNodes) {
        // eslint-disable-next-line
        Array.from(mutation.removedNodes).forEach((node) => {
          if (!(node instanceof HTMLElement && node.classList.contains('pdf_selector_overlay'))) {
            needSync = true;
          }
        })
      }
    }
    if (needSync) {
      syncSettings(messager);
    }
  });
  observer.observe(document.body, { attributes: true, childList: true, subtree: true });
}

async function waitForScroll() {
  const autoScroll = await messager.send('autoScroll')
  if (autoScroll) {
    let domEl = window.document.documentElement;
    if (domEl) {
      while (domEl.scrollHeight === domEl.clientHeight) {
        if (domEl?.parentElement) {
          domEl = domEl.parentElement;
        } else {
          break;
        }
      }
      if (domEl) {
        return new Promise((resolve) => {
          let { scrollTop } = domEl;
          let prevScrollTop = -1;
          const iter = () => {
            if (scrollTop !== prevScrollTop) {
              domEl.scrollTop += domEl.clientHeight / 4;
              prevScrollTop = scrollTop;
              scrollTop = domEl.scrollTop;
            } else {
              setTimeout(() => {
                resolve(null);

                domEl.scrollTop = 0;
              }, 200)
              return;
            }
            setTimeout(() => {
              iter();
            }, 16);
          };
          iter();
        });
      }
    }
  }
}

function init() {
  if (window.__PDFMAKERT_INITED__) {
    return;
  }
  window.__PDFMAKERT_INITED__ = true;
  messager = initMessager();
  initEvents(messager);
  initSettings(messager);
  console.info('ready');
  messager.send('ready');
}

init();


