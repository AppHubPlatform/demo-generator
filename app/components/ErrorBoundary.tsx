'use client';

import React, { Component, ReactNode } from 'react';
import LogRocket from 'logrocket';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[React Error Boundary]', error, errorInfo);

    // Log to LogRocket
    LogRocket.captureException(error, {
      tags: {
        errorType: 'React Error',
        component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'unknown',
      },
      extra: {
        errorInfo: errorInfo.componentStack,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fee',
          border: '2px solid #f00',
          borderRadius: '8px',
          margin: '20px',
        }}>
          <h1 style={{ color: '#c00' }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>
            An error occurred in the application. The error has been logged.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px',
            }}
          >
            Reload Page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>Error Details</summary>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                marginTop: '10px',
              }}>
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
