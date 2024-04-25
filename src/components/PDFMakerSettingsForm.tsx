import React, { useState } from 'react';
import { Form, FormItem } from './Form';
import { Autocomplete, Input, List, MenuItem, Select, Slider, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LocationDisabled, LocationSearching } from '@mui/icons-material';
import { MuiColorInput } from 'mui-color-input';
import { useControllableValue } from 'ahooks';
import { LocalFont } from './PDFMaker';

type Size = {
  width: number;
  height: number;
}

export type PDFPageSettingsFormValue = {
  selectAction: 'select' | 'deselect',
  window: Size;
  scale: number;
  excludeElements: {
    id?: string,
    selector: string
  }[];
  targetElement: {
    id?: string,
    selector: string
  } | null;
}

export type PDFPrintSettingsFormValue = {
  background: string;
  defaultFont: string;
  page: {
    format: string;
    size?: Size
  }
}

interface PDFMakerPrintSettingsFormProps {
  localFonts?: Record<string, LocalFont[]>
  value?: PDFPrintSettingsFormValue
  onChange?: (value: PDFPrintSettingsFormValue) => void;
}

interface SizeInputProps {
  value?: Size,
  onChange?: (s: Size) => void;
  style?: React.CSSProperties;
}

interface NumberInputProps {
  style: React.CSSProperties
}

interface NumberInputProps {
  value?: number
  onChange?: (v: number) => void
}

export function NumberInput(props: NumberInputProps) {
  const [innerValue, setInnerValue] = useControllableValue(props, { defaultValue: 0 })
  return <TextField style={props.style} size='small' value={innerValue} onChange={(e) => {
    if (!isNaN(Number(e.target.value))) {
      setInnerValue(Number(e.target.value))
    }
  }}></TextField>
}

export function SizeInput(props: SizeInputProps) {
  const [innerValue, setInnerValue] = useControllableValue<Size>(props, { defaultValue: { width: 0, height: 0 } });
  return <div style={{ transformOrigin: 'left center', transform: 'scale(0.8)', whiteSpace: 'nowrap' }}>
    <NumberInput style={{ display: 'inline-block', width: 100, verticalAlign: 'middle' }} value={innerValue.width} onChange={(v) => {
      setInnerValue({ ...innerValue, width: Number(v) })
    }}></NumberInput><span style={{ display: 'inline-block', margin: '0 8px' }}>X</span><NumberInput style={{ display: 'inline-block', width: 100, verticalAlign: 'middle' }} value={innerValue.height} onChange={(v) => {
      setInnerValue({ ...innerValue, height: Number(v) })
    }}></NumberInput>
  </div>
}

export function PDFMakerPrintSettingsForm(props: PDFMakerPrintSettingsFormProps) {
  const [innerValue, setInnerValue] = useControllableValue<PDFPrintSettingsFormValue>(props, {
    defaultValue: {
      // TODO 根据平台来选择默认字体
      defaultFont: 'PingFang SC',
      background: '#ffffff',
      page: {
        format: 'a4',
        size: {
          width: 0,
          height: 0,
        }
      }
    }
  });
  return <Form labelWidth={140}>
    <FormItem label='Default Font'>
      <Autocomplete
        disableClearable
        style={{ width: 220, transform: "scale(0.8)", transformOrigin: 'left center' }} size='small'
        options={Object.keys(props.localFonts ?? {}).map((f) => ({ label: f, id: f })) ?? []}
        isOptionEqualToValue={(options, value) => options.id === value.id}
        value={{ id: innerValue.defaultFont, label: innerValue.defaultFont }}
        onChange={(e, v) => {
          setInnerValue({ ...innerValue, defaultFont: v?.id ?? '' })
        }}
        renderInput={(params) => <TextField {...params} />}
      ></Autocomplete>
    </FormItem>
    <FormItem label='Background'>
      <MuiColorInput style={{ transform: "scale(0.8)", transformOrigin: 'left center', width: 220 }} value={innerValue.background} onChange={(v) => {
        setInnerValue({ ...innerValue, background: v })
      }} size='small'></MuiColorInput>
    </FormItem>
    <FormItem label='Page Size'>
      <div style={{ verticalAlign: 'top' }}>
        <Autocomplete
          disableClearable
          style={{ width: 220, transform: "scale(0.8)", transformOrigin: 'left center' }} size='small'
          options={[
            {
              id: 'custom',
              label: 'Custom Size'
            },
            {
              id: 'a4',
              label: 'a4'
            }
          ]}
          isOptionEqualToValue={(options, value) => options.id === value.id}
          value={{ id: innerValue.page.format, label: innerValue.page.format }}
          renderInput={(params) => <TextField {...params} />}
        ></Autocomplete>
        <SizeInput value={innerValue.page.size} onChange={(v) => {
          setInnerValue({ ...innerValue, page: { format: '', size: v } })
        }}></SizeInput>
      </div>
    </FormItem>
  </Form >
}

interface PDFMakerPageSettingsFormProps {
  value?: PDFPageSettingsFormValue
  onChange?: (v: PDFPageSettingsFormValue) => void;
}

export function PDFMakerPageSettingsForm(props: PDFMakerPageSettingsFormProps) {
  const [innerValue, setInnerValue] = useControllableValue<PDFPageSettingsFormValue>(props, {
    defaultValue: {
      selectAction: 'select',
      window: {
        width: 0,
        height: 0,
      },
      scale: 1,
      excludeElements: [],
      targetElement: null,
    }
  });
  return <Form labelWidth={140}>
    <FormItem label='Select Elements'>
      <ToggleButtonGroup
        exclusive
        size='small'
        value={[innerValue.selectAction]}
        color="primary"
        style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}
        onChange={(e, v) => {
          setInnerValue({ ...innerValue, selectAction: v })
        }}
      >
        <ToggleButton value="select">
          <LocationSearching style={{ marginRight: 10 }}></LocationSearching>
          Select
        </ToggleButton>
        <ToggleButton value="deselect">
          <LocationDisabled style={{ marginRight: 10 }}></LocationDisabled>
          DeSelect
        </ToggleButton>
      </ToggleButtonGroup>
    </FormItem>
    <FormItem label='Window'>
      <SizeInput value={innerValue.window} onChange={(v) => setInnerValue({ ...innerValue, window: v })}></SizeInput>
    </FormItem>
    <FormItem label='Scale'>
      <Slider value={innerValue.scale} onChange={(e, v) => setInnerValue({ ...innerValue, scale: v as number })} min={0.1} max={1} step={0.1}></Slider>
    </FormItem>
    <FormItem label='Target Element'>
      {innerValue.targetElement?.selector}
    </FormItem>
    <FormItem label='Exclude Elements'>
      <List></List>
    </FormItem>
  </Form>
}