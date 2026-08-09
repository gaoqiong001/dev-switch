import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { applyTheme, readStoredTheme } from './utils/theme';
import App from './App';
import './index.css';

// 渲染前应用主题，避免启动闪白
applyTheme(readStoredTheme());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
