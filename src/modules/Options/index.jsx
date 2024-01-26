import React from 'react';
import { createRoot } from 'react-dom/client';
import { initFrontendMessageHandler } from "../Frontend/message_handler";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Options from './Options';
import './index.css';

initFrontendMessageHandler();
const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<Options />);
