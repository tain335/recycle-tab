import React from "react";
import { CDialog } from "./extends";
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

interface ConfirmDialogProps {
  title: React.ReactNode,
  content: React.ReactNode,
  children?: (setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  width?: number
}

export function ConfirmDialog({ title, content, width, onCancel, onConfirm, children }: ConfirmDialogProps) {
  return <CDialog body={(setOpen) => <>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent style={{ width: width ?? 600 }} >
      <DialogContentText>
        {content}
      </DialogContentText>
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