import React from 'react';
import ReactDOM from 'react-dom/client';
import { CorridorDashboard } from './components/CorridorDashboard';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <CorridorDashboard />
  </React.StrictMode>
);