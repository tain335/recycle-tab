import React from 'react';
import { Form, FormItem } from './Form';
import { Autocomplete, Slider, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LocationDisabled, LocationSearching } from '@mui/icons-material';
import { MuiColorInput } from 'mui-color-input';
import { useControllableValue } from 'ahooks';
import { LocalFont, Target } from './PDFMaker';
import { TargetList } from './TargetList';
import { PageFormats } from 'web2pdf';
import { capitalize } from 'lodash';

type Size = {
  width: number;
  height: number;
}

export type PDFPageSettingsFormValue = {
  selectAction: 'select' | 'deselect',
  window: Size;
  scale: number;
  excludeElements: Target[];
  targetElement: Target | null;
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
  disabled?: boolean;
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
  disabled?: boolean;
}

export function NumberInput(props: NumberInputProps) {
  const [innerValue, setInnerValue] = useControllableValue(props, { defaultValue: 0 })
  return <TextField disabled={props.disabled} style={props.style} size='small' value={innerValue} onChange={(e) => {
    if (!isNaN(Number(e.target.value))) {
      setInnerValue(Number(e.target.value))
    }
  }}></TextField>
}

export function SizeInput(props: SizeInputProps) {
  const [innerValue, setInnerValue] = useControllableValue<Size>(props, { defaultValue: { width: 0, height: 0 } });
  return <div style={{ transformOrigin: 'left center', transform: 'scale(0.788)', whiteSpace: 'nowrap' }}>
    <NumberInput disabled={props.disabled} style={{ display: 'inline-block', width: 100, verticalAlign: 'middle' }} value={innerValue.width} onChange={(v) => {
      setInnerValue({ ...innerValue, width: Number(v) })
    }}></NumberInput><span style={{ display: 'inline-block', margin: '0 8px' }}>X</span><NumberInput disabled={props.disabled} style={{ display: 'inline-block', width: 100, verticalAlign: 'middle' }} value={innerValue.height} onChange={(v) => {
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
          width: PageFormats['a4'][0],
          height: PageFormats['a4'][1],
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
            ...Object.keys(PageFormats).map((format) => ({ id: format, label: capitalize(format) }))
          ]}
          onChange={(_, option) => {
            if (option.id === 'custom') {
              setInnerValue({
                ...innerValue,
                page: {
                  format: option.id,
                  size: {
                    width: PageFormats['a4'][0],
                    height: PageFormats['a4'][1]
                  }
                }
              })
            } else {
              setInnerValue({
                ...innerValue,
                page: {
                  format: option.id,
                  size: {
                    width: PageFormats[option.id as keyof typeof PageFormats][0],
                    height: PageFormats[option.id as keyof typeof PageFormats][1]
                  }
                }
              })
            }
          }}
          isOptionEqualToValue={(options, value) => options.id === value.id}
          value={{ id: innerValue.page.format, label: capitalize(innerValue.page.format) }}
          renderInput={(params) => <TextField {...params} />}
        ></Autocomplete>
        <SizeInput disabled={innerValue.page.format !== 'custom'} value={innerValue.page.size} onChange={(v) => {
          setInnerValue({ ...innerValue, page: { format: '', size: v } })
        }}></SizeInput>
      </div>
    </FormItem>
  </Form >
}

interface PDFMakerPageSettingsFormProps {
  value?: PDFPageSettingsFormValue
  onChange?: (v: PDFPageSettingsFormValue) => void;
  onDeleteTarget?: (index: number, target: Target) => void;
  onDeleteExclude?: (index: number, target: Target) => void;
  onHighlight?: (target: Target | undefined) => void;
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
      {innerValue.targetElement ? <TargetList
        targets={!innerValue.targetElement ? [] : [innerValue.targetElement]}
        onHover={(index, target) => {
          props.onHighlight?.(target);
        }}
        onDelete={(index, target) => {
          props.onDeleteTarget?.(index, target);
        }}></TargetList> : <span style={{ padding: '13px 0', color: '#999' }}>{'<Empty>'}</span>}
    </FormItem>
    <FormItem label='Exclude Elements'>
      {
        innerValue.excludeElements?.length ?
          <TargetList
            targets={!innerValue.excludeElements ? [] : innerValue.excludeElements}
            onHover={(index, target) => {
              props.onHighlight?.(target);
            }}
            onDelete={(index, target) => {
              props.onDeleteExclude?.(index, target);
            }}
          ></TargetList> : <span style={{ padding: '13px 0', color: '#999' }}>{'<Empty>'}</span>}
    </FormItem>
  </Form>
}