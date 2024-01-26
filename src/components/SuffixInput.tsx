import React from 'react';
import Input from '@mui/material/Input';

type SuffixInputProps = {
  size?: Parameters<typeof Input>[0]['size'],
  style?: React.CSSProperties,
  suffix: React.ReactNode,
  value?: string | number,
  onChange?: (value: string) => void
}

export function SuffixInput({ size, value, suffix, onChange, style }: SuffixInputProps) {
  return <div style={{ display: 'inline-flex', ...style }}>
    <div>
      <Input size={size} value={value} onChange={(e) => onChange?.(e.target.value)}></Input>
    </div>
    <div style={{ alignSelf: 'center', marginLeft: 10, fontSize: '14px' }}>{suffix}</div>
  </div>
}