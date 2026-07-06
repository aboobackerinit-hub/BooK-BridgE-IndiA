import React from 'react';
import { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize authentication
  useAuth();

  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#000',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
    </>
  );
}

export default MyApp;
