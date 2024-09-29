import React, { useRef, useState } from 'react';
import { ConfirmDialog, ConfirmDialogProps } from '@src/components/ConfirmDialog';
import { FavoriteListValue, FavoritesList } from './FavoritesList';
import { MessageType } from '@src/constants/constants';
import { RecycleTab } from '@src/model/recycle_tab';

interface FavoritesDialogProps extends Omit<ConfirmDialogProps, 'content' | 'title'> {
  favoriteTabs?: RecycleTab[]
  convertable?: boolean;
  onConvert?: (favorite: FavoriteListValue) => void
}

export function FavoritesDialog({ children, favoriteTabs, convertable, ...props }: FavoritesDialogProps) {
  const [selection, setSelection] = useState<string[]>([])
  const [favorites, setFavorites] = useState<FavoriteListValue[]>([])
  const openRef = useRef<React.Dispatch<React.SetStateAction<boolean>> | null>(null);
  return <ConfirmDialog
    title="Favorites"
    confirmDisabled={favoriteTabs && !selection.length}
    onOpen={() => {
      openRef.current = null;
      (async () => {
        const favorites: FavoriteListValue[] = await chrome.runtime.sendMessage({ type: MessageType.GetFavorites });
        setFavorites(favorites);
        // 只对单个tab进行初始化处理
        if (favoriteTabs?.length === 1) {
          setSelection(favorites.filter((f) => {
            if (f.tabs.some((t) => t.url === favoriteTabs?.[0]?.url)) {
              return true
            }
            return false
          }).map((f) => f.id));
        } else {
          setSelection([]);
        }
      })()
    }}
    content={<FavoritesList
      convertable={convertable}
      selectable={!!favoriteTabs}
      value={favorites}
      onChange={(value) => {
        setFavorites(value)
      }}
      onConvert={(f) => {
        props.onConvert?.(f);
        openRef.current?.(false);
      }}
      selection={selection}
      onSelect={(selection) => {
        setSelection(selection);
      }}
    ></FavoritesList>
    } onConfirm={async () => {
      const pass = favorites.every((item) => {
        if (item.done) {
          return true;
        } else if (!item.error) {
          item.error = true;
          item.errorText = "Please enter name";
        }
        return false;
      });
      if (!pass) {
        setFavorites([...favorites]);
        throw new Error("form error");
      } else {
        if (favoriteTabs) {
          favorites.forEach((f) => {
            if (selection.includes(f.id)) {
              favoriteTabs.forEach((favoriteTab) => {
                if (f.tabs.findIndex((t) => t.url === favoriteTab.url) === -1) {
                  f.tabs.push(favoriteTab);
                }
              })
            } else {
              // 单个情况会清除其他包含的文件夹，多个的情况下不会清除只会直接导入
              if (favoriteTabs.length === 1) {
                favoriteTabs.forEach((favoriteTab) => {
                  const index = f.tabs.findIndex((t) => t.url === favoriteTab.url);
                  if (index !== -1) {
                    f.tabs.splice(index, 1);
                  }
                });
              }
            }
          });
        }
      }
      chrome.runtime.sendMessage({ type: MessageType.SaveFavorites, data: favorites })
      props.onConfirm?.();
    }}>
    {(setOpen) => {
      openRef.current = setOpen;
      return children?.(setOpen)
    }}
  </ConfirmDialog>
}