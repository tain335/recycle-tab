import React, { useEffect, useRef, useState } from "react";
import SettingsIcon from '@mui/icons-material/Settings';
import Fab from '@mui/material/Fab';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover } from '@mui/material';
import { DeleteOutline, SettingsOutlined, StarOutline } from '@mui/icons-material';
import { MessageType, SettingsValue } from '@src/constants/constants';
import { frontendEmitter } from "@src/events/frontend";
import { SettingFormHandle, SettingsForm } from "./SettingsForm";
import { DefaultSettings } from '@src/constants/constants'
import { getObjectKey } from "@src/utils/getObjectKey";
import { FavoritesDialog } from "./FavoritesDialog";
import { ConfirmDialog } from "@src/components/ConfirmDialog";
import { BatchPDFMaker, BatchPDFMakerRef, BatchPrintState } from "@src/components/BatchPDFMaker";
import { FavoriteListValue } from "./FavoritesList";
import { useCrossMessage } from "@src/hooks/useCrossMessage";

export function SettingsButton() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const config = useCrossMessage(MessageType.ShowConfig);
  const [settingsOpen, setSettingsOpen] = useState(!!config);
  const batchPDFMakerRef = useRef<BatchPDFMakerRef>(null);
  const anchorEl = useRef<HTMLButtonElement | null>(null);
  const [batchPrintState, setBatchPrintState] = useState(BatchPrintState.Pending);
  const [settings, setSettings] = useState<SettingsValue>({
    ...DefaultSettings
  });

  const settingForm = useRef<SettingFormHandle>(null);

  const [favorite, setFavorite] = useState<FavoriteListValue>();

  const handlePopoverClose = () => {
    setPopoverOpen(false)
    anchorEl.current = null;
  }

  useEffect(() => {
    if (config) {
      setSettingsOpen(true);
    }
  }, [config]);

  useEffect(() => {
    (async () => {
      const settings = await chrome.runtime.sendMessage({ type: MessageType.GetSettings });
      setSettings({ ...settings })
    })();
  }, []);

  return <>
    <Fab
      color="primary"
      size="medium"
      style={{ position: 'absolute', right: 60, bottom: 20, zIndex: 1201 }}
      onClick={(event) => {
        anchorEl.current = event.currentTarget;
        setPopoverOpen(!popoverOpen)
      }}>
      <SettingsIcon></SettingsIcon>
    </Fab>
    <Popover
      keepMounted
      style={{ transform: "translate(-80px, -50px)" }}
      open={popoverOpen}
      anchorEl={anchorEl.current}
      onClose={handlePopoverClose}
      anchorOrigin={{
        horizontal: "right",
        vertical: "top",
      }}
    >
      <List style={{ width: 240 }}>
        <ConfirmDialog title="PDF Maker"
          confirmText="Print All"
          confirmTips={batchPrintState === BatchPrintState.Pending ? 'Please set all page settings' : ''}
          confirmDisabled={batchPrintState !== BatchPrintState.Ready}
          confirmLoading={batchPrintState === BatchPrintState.Working}
          width={1100}
          content={<BatchPDFMaker
            onStateChange={(state) => {
              setBatchPrintState(state);
            }}
            ref={batchPDFMakerRef}
            title={favorite?.name ?? ''}
            tabs={favorite?.tabs ?? []}
          ></BatchPDFMaker>}
          onConfirm={async () => {
            await batchPDFMakerRef.current?.printAll();
          }}>
          {
            (setPDFMakerOpen) => <FavoritesDialog
              printable
              onPrint={(favorite) => {
                setFavorite(favorite)
                setPDFMakerOpen(true)
              }}>
              {(setOpen) => <ListItem
                disablePadding
                onClick={() => {
                  setOpen(true);
                  setPopoverOpen(false);
                }}>
                <ListItemButton>
                  <ListItemIcon>
                    <StarOutline />
                  </ListItemIcon>
                  <ListItemText primary="Favorites" />
                </ListItemButton>
              </ListItem>}
            </FavoritesDialog>
          }
        </ConfirmDialog>
        {FEATURE_RECYCLE ? <ListItem disablePadding onClick={async () => {
          setSettingsOpen(true)
          setPopoverOpen(false)
        }}>
          <ListItemButton>
            <ListItemIcon>
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem> : <></>}
        <ConfirmDialog title="Tips" content="Are you sure to remove all records?" onConfirm={async () => {
          try {
            await chrome.runtime.sendMessage<any>({ type: MessageType.ClearAllTabs })
            setPopoverOpen(false);
            frontendEmitter.emit('update_tab_list');
          } catch (err) {

          }
        }}>
          {(setOpen) => <ListItem disablePadding onClick={async () => {
            setOpen(true);
          }}>
            <ListItemButton>
              <ListItemIcon>
                <DeleteOutline />
              </ListItemIcon>
              <ListItemText primary="Clear" />
            </ListItemButton>
          </ListItem>}
        </ConfirmDialog>
      </List>
    </Popover>
    <Dialog open={settingsOpen}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent style={{ width: 600, boxSizing: 'border-box' }}>
        <SettingsForm ref={settingForm} data={settings} key={getObjectKey(settings)}></SettingsForm>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          // reset form
          setSettings({ ...settings })
          setSettingsOpen(false)
        }}>Cancel</Button>
        <Button onClick={async () => {
          try {
            const newSettings = await settingForm.current?.validate()
            if (newSettings) {
              await chrome.runtime.sendMessage({ type: MessageType.UpdateSettings, data: newSettings })
              setSettings(newSettings);
            }
            setSettingsOpen(false)
          } catch (err) { }
        }}>Confirm</Button>
      </DialogActions>
    </Dialog>
  </>
}