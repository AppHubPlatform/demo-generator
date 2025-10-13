'use client';

import { useEffect } from 'react';
import LogRocket from 'logrocket';

export default function LogRocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize in browser
    if (typeof window !== 'undefined') {
      LogRocket.init('apphub/logrocket-demomaker', {
        serverURL: 'https://staging-i.logrocket.io/i',
        dashboardHost: 'https://staging.logrocket.com',
      });

      console.log('[LogRocket] Initialized for app monitoring');

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
    }
  }, []);

  return <>{children}</>;
}
