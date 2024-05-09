import { IconButton, List, ListItem, Tooltip } from '@mui/material';
import React from 'react';
import { Target } from './PDFMaker';
import { Delete } from '@mui/icons-material';
import "./TargetList.scss";

interface TargetListProps {
  targets: Target[];
  onDelete?: (index: number, target: Target) => void;
  onHover?: (index: number, target?: Target) => void;
}

export function TargetList({ targets, onHover, onDelete }: TargetListProps) {
  return <List>
    {
      targets.map((t, index) => <ListItem key={t.id}
        onMouseEnter={() => {
          onHover?.(index, t);
        }}
        onMouseLeave={() => {
          onHover?.(-1, undefined);
        }}
        className='targets__item'
        style={{ padding: 4 }}
        secondaryAction={
          <IconButton size='small' onClick={() => {
            onDelete?.(index, t);
          }}>
            <Delete style={{ fontSize: 18 }}></Delete>
          </IconButton>
        }>
        <Tooltip title={t.selector}>
          <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 120 }}>{t.selector}</div>
        </Tooltip>
      </ListItem>)
    }
  </List>
}