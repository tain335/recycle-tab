import React from "react";
import { CDialog } from "./extends";
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { isString } from "lodash";
import { Loading } from "./Loading";

export interface ConfirmDialogProps {
  title: React.ReactNode,
  content: React.ReactNode,
  onOpen?: () => void,
  children?: (setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode
  onConfirm?: () => Promise<void>
  onCancel?: () => void
  width?: number | string
  confirmText?: string;
  cancelText?: string;
  cancelLoading?: boolean;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

export function ConfirmDialog({
  confirmDisabled,
  cancelDisabled,
  title,
  content,
  width,
  onCancel,
  onConfirm,
  children,
  onOpen,
  confirmText,
  cancelText,
  confirmLoading,
  cancelLoading
}: ConfirmDialogProps) {
  return <CDialog
    onOpen={onOpen}
    maxWidth='xl'
    body={(setOpen) => <>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <div style={{ width: width ?? 600 }}>
          {isString(content) ? <DialogContentText>
            {content}
          </DialogContentText> : content}
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={cancelDisabled || cancelLoading} onClick={() => {
          try {
            onCancel?.()
            setOpen(false);
          } catch (err) {

          }
        }}>{cancelText ?? 'Cancel'}{cancelLoading ? <Loading></Loading> : <></>}</Button>
        <Button disabled={confirmDisabled || confirmLoading} onClick={async () => {
          try {
            await onConfirm?.()
            setOpen(false);
          } catch (err) {

          }
        }} autoFocus>{confirmText ?? 'Confirm'}{confirmLoading ? <Loading></Loading> : <></>}</Button>
      </DialogActions>
    </>}>
    {
      (setOpen) => children?.(setOpen)
    }
  </CDialog>
}