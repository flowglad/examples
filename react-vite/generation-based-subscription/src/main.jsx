import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.jsx';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

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

// Only render if we have a Clerk key
if (!clerkPubKey) {
  createRoot(document.getElementById('root')).render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Configuration Error</h1>
      <p>Missing VITE_CLERK_PUBLISHABLE_KEY environment variable</p>
      <p>Please add it to your .env file and restart the dev server</p>
    </div>
  );
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
