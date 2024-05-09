import React, { useEffect, useState } from 'react';
import { Button, IconButton, Input, Link, List, ListItem, Checkbox } from '@mui/material';
import { useControllableValue } from 'ahooks';
import { Add, DragIndicator, Close, Done, Edit, KeyboardArrowDown, KeyboardArrowRight, Print } from '@mui/icons-material';
import { FormControl } from '@src/components/Form';
import { nanoid } from 'nanoid';
import { uniq } from 'lodash';
import { FavoriteItem, MessageType } from '@src/constants/constants';
import { SortableList } from '@src/components/SortableList';

export type FavoriteListValue = FavoriteItem & {
  error?: boolean;
  errorText?: string;
}

interface FavoriteListProps {
  selectable?: boolean
  printable?: boolean
  value?: FavoriteListValue[],
  onChange?: (value: FavoriteListValue[]) => void
  selection?: string[],
  onSelect?: (selection: string[]) => void;
  onPrint?: (favorite: FavoriteListValue) => void;
}

export function FavoritesList(props: FavoriteListProps) {
  const [innerValue, setInnerValue] = useControllableValue<FavoriteListValue[]>(props, {
    defaultValue: []
  });
  const [expandedKey, setExpandedKey] = useState('');
  const removeItem = (index: number) => {
    const [deleteItem] = innerValue.splice(index, 1);
    setInnerValue([...innerValue])
    if (props.selection?.includes(deleteItem.id)) {
      const index = props.selection.findIndex((id) => id === deleteItem.id);
      const copySelecotion = props.selection.slice(0);
      copySelecotion.splice(index, 1);
      props.onSelect?.([...copySelecotion]);
    }
  }
  console.log('innerValue', innerValue);
  return <div>
    {!innerValue.length ? <div style={{ textAlign: 'center', color: '#acacac', fontSize: 18 }}>No Favorites</div> : <></>}
    <List>
      {
        innerValue.map((item, index) => {
          return <React.Fragment key={item.id}>
            <ListItem key={item.id} style={{ width: '100%', padding: 0 }}>
              {item.done ? <>
                {
                  props.printable ? <IconButton disabled={!item.tabs.length} size="small" onClick={() => {
                    setExpandedKey(item.id === expandedKey ? '' : item.id);
                  }}>
                    {expandedKey === item.id ? <KeyboardArrowDown fontSize="small"></KeyboardArrowDown> : <KeyboardArrowRight fontSize="small"></KeyboardArrowRight>}
                  </IconButton> : <></>
                }
                <div style={{ display: 'inline-block', flex: 1, fontSize: 16 }}>
                  <div style={{ margin: '10px 0' }}>{item.name}<Link component="button" style={{ textDecoration: 'none', verticalAlign: 'baseline' }}>({item.tabs.length})</Link></div>
                </div>
                <div>
                  {props.selectable ? <Checkbox checked={props.selection?.includes(item.id)} onChange={(e) => {
                    if (props.selection?.includes(item.id)) {
                      const index = props.selection.findIndex((id) => id === item.id);
                      const copySelecotion = props.selection.slice(0);
                      copySelecotion.splice(index, 1);
                      props.onSelect?.([...copySelecotion])
                    } else {
                      props.onSelect?.(uniq([...(props.selection ?? []), item.id]));
                    }
                  }}></Checkbox> : <></>}
                  {
                    props.printable ?
                      <IconButton disabled={!item.tabs.length} size="small"
                        onClick={() => {
                          props.onPrint?.(item);
                        }}>
                        <Print fontSize="small"></Print>
                      </IconButton>
                      : <></>
                  }
                  <IconButton size="small" onClick={() => {
                    item.done = false;
                    setInnerValue([...innerValue])
                  }}>
                    <Edit fontSize="small"></Edit>
                  </IconButton>
                  <IconButton size="small" onClick={() => removeItem(index)}>
                    <Close fontSize="small"></Close>
                  </IconButton>
                </div></>
                : <><FormControl error={item.error} errorText={item.errorText}>
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
            <ListItem style={{ padding: 0, paddingLeft: 20 }}>
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 20 }}>
                {
                  expandedKey === item.id ? <>
                    <SortableList
                      recordKey="tabId"
                      value={item.tabs}
                      render={(tab) => <div style={{ display: 'flex', lineHeight: '24px' }}>
                        <div style={{ flexBasis: 32, flexShrink: 0 }}><DragIndicator fontSize='small'></DragIndicator></div>
                        <Link href={tab.url} style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{tab.title}</Link>
                      </div>}
                      onChange={(newTabs) => {
                        item.tabs = newTabs;
                        setInnerValue([...innerValue]);
                      }}></SortableList>
                  </> : <></>
                }
              </div>
            </ListItem>
          </React.Fragment>
        })
      }
    </List>
    <Button
      style={{ width: '100%' }}
      size="small"
      startIcon={<Add fontSize="small"></Add>}
      onClick={() => {
        setInnerValue([...innerValue, { id: nanoid(), name: '', done: false, tabs: [] }])
      }}
    >Add</Button>
  </div >
}

export function StorageFavoritesList(props: Omit<FavoriteListProps, 'value' | 'onChange'>) {
  const [favorites, setFavorites] = useState<FavoriteListValue[]>([])
  useEffect(() => {
    (async () => {
      const favorites = await chrome.runtime.sendMessage({ type: MessageType.GetFavorites });
      setFavorites(favorites)
    })()
  }, [])
  return <FavoritesList
    {...props}
    value={favorites}
    onChange={(value) => {
      setFavorites(value);
      chrome.runtime.sendMessage({ type: MessageType.SaveFavorites, data: favorites });
    }}></FavoritesList>
}