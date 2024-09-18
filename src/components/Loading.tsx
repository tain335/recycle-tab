import React from 'react';
import { HourglassTop } from "@mui/icons-material";
import "./Loading.css"
import { SvgIconOwnProps } from '@mui/material';

export function Loading({ style, fontSize }: { style?: React.CSSProperties, fontSize?: SvgIconOwnProps['fontSize'] }) {
  return <HourglassTop fontSize={fontSize} style={{ animation: '1.2s ease-in infinite fadein reverse', ...style }}></HourglassTop>
}