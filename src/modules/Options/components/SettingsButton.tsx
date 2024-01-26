import React, { useEffect, useRef, useState } from "react";
import SettingsIcon from '@mui/icons-material/Settings';
import Fab from '@mui/material/Fab';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover } from '@mui/material';
import { DeleteOutline, SettingsOutlined } from '@mui/icons-material';
import { MessageType, SettingsValue } from '@src/constants/constants';
import { frontendEmitter } from "@src/events/frontend";
import { SettingFormHandle, SettingsForm } from "./SettingsForm";
import { DefaultSettings } from '@src/constants/constants'
import { getObjectKey } from "@src/utils/getObjectKey";


export function SettingsButton() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(!!localStorage.getItem("show_config"));
  const anchorEl = useRef<HTMLButtonElement | null>(null);
  const [settings, setSettings] = useState<SettingsValue>({
    ...DefaultSettings
  });

  const settingForm = useRef<SettingFormHandle>(null);

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
        setPopoverOpen(true)
      }}>
      <SettingsIcon></SettingsIcon>
    </Fab>
    <Popover
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
        {/* <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <DeleteOutline />
            </ListItemIcon>
            <ListItemText primary="Collections" />
          </ListItemButton>
        </ListItem> */}
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
        <ListItem disablePadding onClick={async () => {
          setClearDialogOpen(true)
          setPopoverOpen(false)
        }}>
          <ListItemButton>
            <ListItemIcon>
              <DeleteOutline />
            </ListItemIcon>
            <ListItemText primary="Clear" />
          </ListItemButton>
        </ListItem>
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
    <Dialog open={clearDialogOpen}>
      <DialogTitle>Tips</DialogTitle>
      <DialogContent style={{ width: 600 }} >
        <DialogContentText>
          Are you sure to remove all records?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setClearDialogOpen(false)
        }}>Cancel</Button>
        <Button onClick={async () => {
          try {
            await chrome.runtime.sendMessage<any>({ type: MessageType.ClearAllTabs })
            setClearDialogOpen(false)
            frontendEmitter.emit('update_tab_list');
          } catch (err) {

          }
        }} autoFocus>Confirm</Button>
      </DialogActions>
    </Dialog>
  </>
}