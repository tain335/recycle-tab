import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Popup from './Popup';
import './index.css';

const container = document.getElementById('app-container');
const root = createRoot(container as HTMLDivElement); // createRoot(container!) if you use TypeScript
root.render(<Popup />);
