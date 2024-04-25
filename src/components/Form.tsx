
import React, { useCallback, useContext } from 'react';
import { FormHelperText, FormControl as MFormControl } from '@mui/material';

interface FormControlProps {
  error?: boolean
  errorText?: React.ReactNode
  helperText?: React.ReactNode
  children: React.ReactNode
}

export const FormContext = React.createContext<{ labelWidth: undefined | number }>({ labelWidth: undefined });

export function FormControl({ error, errorText, helperText, children }: FormControlProps) {
  return <MFormControl error={error} style={{ width: '100%' }}>
    {children}
    <FormHelperText>{error ? errorText : helperText}</FormHelperText>
  </MFormControl>
}

interface FormItemProps {
  required?: boolean,
  label: string,
  labelWidth?: number,
  children: React.ReactNode,
  name?: string
  control?: Omit<FormControlProps, 'children'>
}

export function FormItem({ label, children, required, name, control }: FormItemProps) {
  const context = useContext(FormContext)
  return <div style={{ display: 'flex', alignItems: 'center' }}>
    {label ? <div style={{ fontSize: '14px', fontWeight: 500, width: context.labelWidth, flex: context.labelWidth ? undefined : 1, flexShrink: 0, }}>{label}</div> : <></>}
    <div style={{ flex: 1, textAlign: 'center' }}>
      <FormControl {...control}>
        {children}
      </FormControl>
    </div>
  </div>
}

export function Form({ children, labelWidth }: { children: React.ReactNode, labelWidth?: number }) {
  const context = useContext(FormContext)
  return <FormContext.Provider value={{ labelWidth: labelWidth ? labelWidth : context.labelWidth }}>
    {
      children
    }
  </FormContext.Provider>
}
