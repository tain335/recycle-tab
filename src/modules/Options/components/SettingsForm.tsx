import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Form, FormItem } from '@src/components/Form';
import { Switch } from '@mui/material';
import { SuffixInput } from '@src/components/SuffixInput';
import { useControllableValue } from 'ahooks'
import { isInteger } from 'lodash'
import { GlobList } from './GlobList';
import { useSetState } from 'ahooks';
import { PrimarySettingsValue, SettingsValue } from '@src/constants/constants';
import { isEmpty } from 'lodash';

export type SettingsControl = {
  [key in keyof PrimarySettingsValue]?: {
    error: boolean,
    errorText?: string;
  }
}

interface SettingsSubFormProps {
  value?: PrimarySettingsValue,
  control?: SettingsControl
  onChange?: (data: PrimarySettingsValue) => void
}


export function validateSubSettings(value: PrimarySettingsValue): SettingsControl {
  const control: SettingsSubFormProps['control'] = {}
  if (!isInteger(Number(value.inactiveDuration)) || Number(value.inactiveDuration) <= 0) {
    control['inactiveDuration'] = {
      error: true,
      errorText: 'Please input positive integer'
    }
  }
  if (!isInteger(Number(value.recycleStart)) || Number(value.recycleStart) <= 0) {
    control['recycleStart'] = {
      error: true,
      errorText: 'Please input positive integer'
    }
  }
  return control;
}

export function SettingsSubForm(props: SettingsSubFormProps) {
  const [innerValue, setInnerValue] = useControllableValue<PrimarySettingsValue>(props, {
    defaultValue: {
      autoRecycle: true,
      inactiveDuration: 30,
      recycleStart: 10
    }
  })
  return <Form>
    <FormItem label='Auto Recycle' control={props.control?.autoRecycle}>
      <Switch size='small'
        value={innerValue.autoRecycle}
        checked={innerValue.autoRecycle}
        onChange={(e, v) => setInnerValue({ ...innerValue, autoRecycle: v })}
      ></Switch>
    </FormItem>
    <FormItem label='Inactive Duration' control={props.control?.inactiveDuration}>
      <SuffixInput
        size='small'
        suffix="Mins"
        value={innerValue.inactiveDuration}
        onChange={(v) => setInnerValue({ ...innerValue, inactiveDuration: v })}
      ></SuffixInput>
    </FormItem>
    <FormItem label='Recycle Start' control={props.control?.recycleStart}>
      <SuffixInput
        size='small'
        suffix="Tabs"
        value={innerValue.recycleStart}
        onChange={(v) => setInnerValue({ ...innerValue, recycleStart: v })}
      ></SuffixInput>
    </FormItem>
    {/* <Item title='Storage'>
          <RadioGroup
            row
          >
            <FormControlLabel value="local" control={<Radio size='small' />} label="Local" />
            <FormControlLabel value="remote" control={<Radio size='small' />} label="Remote" />
          </RadioGroup>
        </Item> */}
  </Form>
}

export type SettingsFormValue = PrimarySettingsValue & {
  recycleExludes: string[]
  recycleIncludes: string[]
}

export type SettingFormHandle = {
  validate: () => Promise<SettingsValue>;
};

interface SettingsFormProps {
  data: SettingsFormValue
}

export const SettingsForm = forwardRef<SettingFormHandle, SettingsFormProps>(function SettingsForm({ data }: SettingsFormProps, ref) {
  const [state, setState] = useSetState<PrimarySettingsValue & {
    recycleExludes: { value: string, done: boolean, error?: boolean, errorText?: string }[]
    recycleIncludes: { value: string, done: boolean, error?: boolean, errorText?: string }[]
  }>(() => {
    return {
      ...data,
      recycleExludes: data.recycleExludes.map((v) => ({ value: v, done: true })),
      recycleIncludes: data.recycleIncludes.map((v) => ({ value: v, done: true }))
    }
  })
  const [settingsControl, setSettingsControl] = useState<SettingsControl>({});
  useImperativeHandle(ref, () => {
    return {
      validate: async () => {
        const recycleExludesPass = state.recycleExludes.every((item) => {
          if (item.done) {
            return true;
          } else if (!item.error) {
            item.error = true;
            item.errorText = "Please confirm value";
          }
          return false;
        });
        const recycleIncludesPass = state.recycleIncludes.every((item) => {
          if (item.done) {
            return true;
          } else if (!item.error) {
            item.error = true;
            item.errorText = "Please confirm value";
          }
          return false;
        });
        const control = validateSubSettings(state);
        setSettingsControl(control);
        if (!recycleExludesPass || !recycleIncludesPass || !isEmpty(control)) {
          setState({ ...state })
          throw new Error("form error");
        }
        return {
          ...state,
          recycleExludes: state.recycleExludes.map(({ value }) => value),
          recycleIncludes: state.recycleIncludes.map(({ value }) => value)
        }
      }
    }
  })
  return <div style={{ width: 480, margin: '0 auto' }}>
    <Form>
      <SettingsSubForm value={state} onChange={(v) => {
        setState(v)
      }} control={settingsControl}></SettingsSubForm>
      <FormItem label='Recycle Exclude'>
        <GlobList value={state.recycleExludes} onChange={(v) => {
          setState({
            recycleExludes: v
          })
        }}></GlobList>
      </FormItem>
      <FormItem label='Recycle Include'>
        <GlobList value={state.recycleIncludes} onChange={(v) => {
          setState({
            recycleIncludes: v
          })
        }}></GlobList>
      </FormItem>
    </Form>
  </div>
})