import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '@/styles/globals.css';

document.documentElement.classList.add('dark');

if (import.meta.env.DEV) {
  void import('@/lib/viz-control-bridge').then(({ mountVizControlBridge }) => {
    mountVizControlBridge();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
