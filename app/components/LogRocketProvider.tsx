'use client';

import { useEffect } from 'react';
import LogRocket from 'logrocket';

// Extend Window interface to include LogRocket
declare global {
  interface Window {
    LogRocket: typeof LogRocket;
  }
}

export default function LogRocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize in browser
    if (typeof window !== 'undefined') {
      LogRocket.init('apphub/logrocket-demomaker', {
        serverURL: 'https://staging-i.logrocket.io/i',
        dashboardHost: 'https://staging.logrocket.com',
      } as any);

      window.LogRocket = LogRocket

      LogRocket.getSessionURL(sessionURL => {
        console.log('[LogRocket] Session URL:', sessionURL);
      });

      // Fetch user info from Cloudflare Access header
      fetch('/api/user')
        .then(response => response.json())
        .then(data => {
          if (data.authenticated && data.email) {
            LogRocket.identify(data.email, {
              email: data.email,
            });
            console.log('[LogRocket] User identified:', data.email);
          } else {
            console.log('[LogRocket] No authenticated user found');
          }
        })
        .catch(err => {
          console.error('[LogRocket] Error fetching user info:', err);
        });

      // Global error handler for JavaScript errors
      const handleError = (event: ErrorEvent) => {
        console.error('[Global Error Handler]', event.error || event.message);

        LogRocket.captureException(event.error || new Error(event.message), {
          tags: {
            errorType: 'JavaScript Error',
            source: event.filename || 'unknown',
          },
          extra: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString(),
          },
        });
      };

      // Global handler for unhandled promise rejections
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        console.error('[Unhandled Promise Rejection]', event.reason);

        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

        LogRocket.captureException(error, {
          tags: {
            errorType: 'Unhandled Promise Rejection',
          },
          extra: {
            reason: String(event.reason),
            timestamp: new Date().toISOString(),
          },
        });
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      // Cleanup function to remove event listeners
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  return <>{children}</>;
}
