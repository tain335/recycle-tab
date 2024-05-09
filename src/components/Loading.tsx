import React from 'react';
import { HourglassTop } from "@mui/icons-material";
import "./Loading.css"

export function Loading({ style }: { style?: React.CSSProperties }) {
  return <HourglassTop style={{ animation: '1.2s ease-in infinite fadein reverse', ...style }}></HourglassTop>
}