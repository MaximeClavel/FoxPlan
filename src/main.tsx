import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/styles/theme.css';
import './shared/ui/ui.css';
import './app/styles/layout.css';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
