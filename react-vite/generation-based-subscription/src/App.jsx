import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { authClient } from './lib/auth-client';
import { FlowgladProviderWrapper } from './components/providers';
import { TooltipProvider } from './components/ui/tooltip';
import { Navbar } from './components/navbar';
import { HomePage } from './pages/home';
import { PricingPage } from './pages/pricing';
import { SignInPage } from './pages/sign-in';
import { SignUpPage } from './pages/sign-up';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      navigate('/sign-in', { replace: true });
    }
  }, [session, isPending, navigate]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Routes>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <FlowgladProviderWrapper>
                      <Navbar />
                    <HomePage />
                  </FlowgladProviderWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute>
                  <FlowgladProviderWrapper>
                      <Navbar />
                    <PricingPage />
                  </FlowgladProviderWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
