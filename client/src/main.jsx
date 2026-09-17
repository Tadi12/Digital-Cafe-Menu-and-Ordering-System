import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n/config';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <ToastContainer position="top-right" autoClose={3000} />
  </>,
);
