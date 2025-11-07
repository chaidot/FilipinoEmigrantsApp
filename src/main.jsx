import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // make sure the filename matches
import { AuthProvider } from "./AuthContext";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);