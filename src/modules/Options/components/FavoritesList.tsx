import React from 'react';
import { Button, IconButton, Input, Link, List, ListItem } from '@mui/material';
import { RecycleTab } from '@src/model/recycle_tab';
import { useControllableValue } from 'ahooks';
import { getObjectKey } from '@src/utils/getObjectKey';
import { Add, Close, Done, Edit } from '@mui/icons-material';
import { FormControl } from '@src/components/Form';

type FavoriteListValue = {
  name: string;
  done: boolean,
  error?: boolean;
  errorText?: string;
  tabs: RecycleTab[]
}

interface FavoriteListProps {
  value?: FavoriteListValue[],
  onChange?: (value: FavoriteListValue[]) => void
}

export function FavoritesList(props: FavoriteListProps) {
  const [innerValue, setInnerValue] = useControllableValue<FavoriteListValue[]>(props, {
    defaultValue: []
  });

  const removeItem = (index: number) => {
    innerValue.splice(index, 1);
    setInnerValue([...innerValue])
  }
  return <div>
    {!innerValue.length ? <div style={{ textAlign: 'center', color: '#acacac', fontSize: 18, margin: '10px 0' }}>No Favorites</div> : <></>}
    <List>
      {
        innerValue.map((item, index) => {
          return <ListItem key={getObjectKey(item)} style={{ width: '100%', paddingLeft: 0, paddingRight: 0 }}>
            {item.done ? <><span style={{ display: 'inline-block', flex: 1, fontSize: 16 }}>{item.name}<Link component="button" style={{ textDecoration: 'none' }}>({item.tabs.length})</Link></span><IconButton size="small" onClick={() => {
              item.done = false;
              setInnerValue([...innerValue])
            }}>
              <Edit fontSize="small"></Edit>
            </IconButton>
              <IconButton size="small" onClick={() => removeItem(index)}>
                <Close fontSize="small"></Close>
              </IconButton></> : <><FormControl error={item.error} errorText={item.errorText}>
                <Input placeholder='Please enter name' value={item.name} onChange={(e) => {
                  item.name = e.target.value;
                  setInnerValue([...innerValue])
                }}></Input>
              </FormControl><IconButton size="small" onClick={() => {
                if (!item.name) {
                  item.error = true;
                  item.errorText = "Please enter name";
                  setInnerValue([...innerValue])
                } else {
                  item.done = true;
                  item.error = false;
                  setInnerValue([...innerValue])
                }
              }}>
                <Done fontSize="small"></Done>
              </IconButton>
              <IconButton size="small" onClick={() => removeItem(index)}>
                <Close fontSize="small"></Close>
              </IconButton></>}

          </ListItem>
        })
      }
    </List>
    <Button
      style={{ width: '100%' }}
      size="small"
      startIcon={<Add fontSize="small"></Add>}
      onClick={() => {
        setInnerValue([...innerValue, { name: '', done: false, tabs: [] }])
      }}
    >Add</Button>
  </div>
}