import { Dialog } from '@mui/material';
import React, { ReactNode, useLayoutEffect, useState } from 'react'

function withModal<P extends JSX.IntrinsicAttributes>(Component: React.ComponentType<P>) {
  return function Modal(props: Omit<P, 'children' | 'open'> & {
    children?: (setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode,
    body?: ReactNode | ((setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode)
    onOpen?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    useLayoutEffect(() => {
      if (open) {
        props.onOpen?.()
      }
    }, [open])
    const { children, body, onOpen, ...p } = props;
    return <>
      {/*@ts-ignore*/}
      <Component
        {...p}
        open={open}
      >{typeof body === "function" ? body(setOpen) : body}</Component>
      {children?.(setOpen)}
    </>
  }
}

export const CDialog = withModal(Dialog);
// export const CPopover = withModal(Popover);