import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // esbuild will resolve App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ThemeGenerator from './components/ThemeGenerator.jsx';

// Create a client
const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeGenerator>
          <App />
        </ThemeGenerator>
      </QueryClientProvider>
    </React.StrictMode>
  );
}