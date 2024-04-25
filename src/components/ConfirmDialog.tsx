import React from "react";
import { CDialog } from "./extends";
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { isString } from "lodash";

export interface ConfirmDialogProps {
  title: React.ReactNode,
  content: React.ReactNode,
  children?: (setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  width?: number | string
}

export function ConfirmDialog({ title, content, width, onCancel, onConfirm, children }: ConfirmDialogProps) {
  return <CDialog maxWidth='xl' body={(setOpen) => <>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <div style={{ width: width ?? 600 }}>
        {isString(content) ? <DialogContentText>
          {content}
        </DialogContentText> : content}
      </div>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => {
        try {
          onCancel?.()
          setOpen(false);
        } catch (err) {

        }
      }}>Cancel</Button>
      <Button onClick={() => {
        try {
          onConfirm?.()
          setOpen(false);
        } catch (err) {

        }
      }} autoFocus>Confirm</Button>
    </DialogActions>
  </>}>
    {
      (setOpen) => children?.(setOpen)
    }
  </CDialog>
}