import React, { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import './Popup.css';
import { FormItem, Form } from '@src/components/Form';
import { SettingsControl, SettingsSubForm, validateSubSettings } from '../Options/components/SettingsForm';
import { MessageType, PrimarySettingsValue } from '@src/constants/constants';

function Popup() {
  const [settings, setSettings] = useState<PrimarySettingsValue>({
    autoRecycle: true,
    inactiveDuration: 30,
    recycleStart: 10
  })
  const [settingsControl, setSettingsControl] = useState<SettingsControl>({});
  useEffect(() => {
    (async () => {
      const settings = await chrome.runtime.sendMessage({ type: MessageType.GetSettings });
      setSettings({ ...settings })
    })()
  }, []);
  return (
    <div className="App" style={{ padding: 16 }}>
      <Stack spacing={1}>
        <Form>
          <SettingsSubForm value={settings} control={settingsControl} onChange={(v) => {
            setSettings(v);
            const constrol = validateSubSettings(v);
            setSettingsControl(constrol)
            if (!constrol.inactiveDuration?.error && !constrol.recycleStart?.error) {
              chrome.runtime.sendMessage({ type: MessageType.UpdateSettings, data: v })
            }
          }}></SettingsSubForm>
          <FormItem label='Recycle Exclude/Include'>
            <Button size='small' style={{ width: '100%' }} onClick={() => {
              window.localStorage.setItem('show_config', '1');
              chrome.runtime.openOptionsPage()

            }}>Config</Button>
          </FormItem>
          {/* <FormItem label='Recycle Quick Action'>
            <Stack spacing={1}>
              <Button size="small" variant="outlined">Last 10 Mins</Button>
              <Button size="small" variant="outlined">Current Window</Button>
              <Button size="small" variant="outlined">All(Exclude Current Tab)</Button>
              <Button size="small" variant="outlined">All</Button>
            </Stack>
          </FormItem> */}
          <FormItem label='Recycle Stash'>
            <Button size='small' variant='contained' style={{ width: '100%' }} onClick={() => {
              chrome.runtime.openOptionsPage()
            }}>View</Button>
          </FormItem>
        </Form>
      </Stack>
    </div>
  );
};

export default Popup;
