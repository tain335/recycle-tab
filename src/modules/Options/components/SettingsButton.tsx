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
import { BatchPDFMaker } from "@src/components/BatchPDFMaker";
import { FavoriteListValue } from "./FavoritesList";

export function SettingsButton() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(!!localStorage.getItem("show_config"));
  const anchorEl = useRef<HTMLButtonElement | null>(null);
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
    (async () => {
      const settings = await chrome.runtime.sendMessage({ type: MessageType.GetSettings });
      setSettings({ ...settings })
    })()

    localStorage.removeItem("show_config")
    const storageListener = (event: StorageEvent) => {
      if (event.key === "show_config" && event.newValue === "1") {
        setSettingsOpen(true)
        localStorage.removeItem("show_config")
      }
    };
    window.addEventListener("storage", storageListener)
    return () => {
      window.removeEventListener("storage", storageListener)
    }
  }, [])

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
        <ConfirmDialog title="PDF Makder" confirmText="Print All" width={1000} content={<BatchPDFMaker title={favorite?.name ?? ''} tabs={favorite?.tabs ?? []}></BatchPDFMaker>} onConfirm={async () => { }}>
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
                  setOpen(true)
                  setPopoverOpen(false)
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
        <ListItem disablePadding onClick={async () => {
          setSettingsOpen(true)
          setPopoverOpen(false)
        }}>
          <ListItemButton>
            <ListItemIcon>
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
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