import React from "react";
import { CDialog } from "./extends";
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip } from "@mui/material";
import { isString } from "lodash";
import { Loading } from "./Loading";

export interface ConfirmDialogProps {
  title: React.ReactNode,
  content: React.ReactNode,
  open?: boolean,
  onOpen?: () => void,
  onClose?: () => void,
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
  confirmTips?: string;
}

export function ConfirmDialog({
  open,
  confirmDisabled,
  cancelDisabled,
  title,
  content,
  width,
  onCancel,
  onConfirm,
  children,
  onOpen,
  onClose,
  confirmText,
  cancelText,
  confirmTips,
  confirmLoading,
  cancelLoading
}: ConfirmDialogProps) {
  return <CDialog
    open={open}
    onOpen={onOpen}
    onClose={onClose}
    maxWidth={false}
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
        <Tooltip title={confirmTips} arrow placement="top">
          <Button style={{ pointerEvents: confirmDisabled && !confirmTips ? 'none' : 'all' }} disabled={confirmDisabled || confirmLoading} onClick={async () => {
            try {
              await onConfirm?.()
              setOpen(false);
            } catch (err) {

            }
          }} autoFocus>{confirmText ?? 'Confirm'}{confirmLoading ? <Loading></Loading> : <></>}</Button>
        </Tooltip>
      </DialogActions>
    </>}>
    {
      (setOpen) => children?.(setOpen)
    }
  </CDialog>
}