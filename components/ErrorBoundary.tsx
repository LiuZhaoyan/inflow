'use client';

import React, { ReactNode, useState, useCallback } from 'react';

/**
 * Error details for error boundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary Component
 * Prevents full-page crashes by catching React component errors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);

    // Call callback if provided
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button onClick={this.reset} style={styles.button}>
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary>Error details (development only)</summary>
                <pre style={styles.pre}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for catching async errors
 */
export function useAsyncError() {
  const [, setError] = useState();

  return useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

/**
 * Styles for error boundary
 */
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  } as React.CSSProperties,
  content: {
    maxWidth: '500px',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
  } as React.CSSProperties,
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5',
  } as React.CSSProperties,
  button: {
    padding: '10px 24px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  details: {
    marginTop: '24px',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  pre: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
    color: '#333',
    marginTop: '8px',
  } as React.CSSProperties,
};
