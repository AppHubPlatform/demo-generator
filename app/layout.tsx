import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import LogRocketProvider from './components/LogRocketProvider';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'LogRocket Demo Maker',
  description: 'GUI for running browser automation scripts',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        <LogRocketProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </LogRocketProvider>
      </body>
    </html>
  )
}
