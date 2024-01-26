import React from "react";
import { Add, Close, Done, Edit } from "@mui/icons-material";
import { Button, IconButton, List, ListItem, ListItemText, Input } from "@mui/material";
import { useControllableValue } from 'ahooks';
import { getObjectKey } from "@src/utils/getObjectKey";
import { FormControl } from "@src/components/Form";

export type GlobListValue = {
  value: string;
  done: boolean;
  error?: boolean;
  errorText?: string;
}

interface GlobListProps {
  value?: GlobListValue[],
  onChange?: (value: GlobListValue[]) => void
}

export function GlobList(props: GlobListProps) {
  const [innerValue, setInnerValue] = useControllableValue<GlobListValue[]>(props, {
    defaultValue: []
  });
  const removeItem = (index: number) => {
    innerValue.splice(index, 1);
    setInnerValue([...innerValue])
  }
  return <div>
    <List>
      {
        innerValue.map((item, index) => {
          return item.done ? (<ListItem key={getObjectKey(item)} style={{ width: 228, paddingLeft: 0, paddingRight: 0 }}>
            <ListItemText style={{ flex: 1 }}>{item.value}</ListItemText>
            <IconButton size="small" onClick={() => {
              item.done = false;
              setInnerValue([...innerValue])
            }}>
              <Edit fontSize="small"></Edit>
            </IconButton>
            <IconButton size="small" onClick={() => removeItem(index)}>
              <Close fontSize="small"></Close>
            </IconButton>
          </ListItem>) : (<ListItem key={getObjectKey(item)} style={{ width: 228, paddingLeft: 0, paddingRight: 0 }}>
            <FormControl error={item.error} errorText={item.errorText}>
              <Input placeholder="eg: *.google.com" value={item.value} onChange={(e) => {
                item.value = e.target.value;
                setInnerValue([...innerValue])
              }}></Input>
            </FormControl>
            <IconButton size="small" onClick={() => {
              if (!item.value) {
                item.error = true;
                item.errorText = "Please enter glob value";
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
            </IconButton>
          </ListItem>)
        })
      }

    </List>
    <Button
      style={{ width: '100%' }}
      size="small"
      startIcon={<Add fontSize="small"></Add>}
      onClick={() => {
        setInnerValue([...innerValue, { value: '', done: false }])
      }}
    >Add</Button>
  </div >
}