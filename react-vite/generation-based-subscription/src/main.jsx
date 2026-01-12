import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Error boundary component
function ErrorFallback({ error }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <p style={{ color: 'red' }}>{error?.message || 'Unknown error'}</p>
      <button onClick={() => window.location.reload()}>Reload Page</button>
    </div>
  );
}

// Wrapper to catch errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
    </StrictMode>
  );
