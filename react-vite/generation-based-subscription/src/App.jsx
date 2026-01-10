import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { FlowgladProviderWrapper } from './components/providers';
import { TooltipProvider } from './components/ui/tooltip';
import { Navbar } from './components/navbar';
import { HomePage } from './pages/home';
import { PricingPage } from './pages/pricing';
import { SignInPage } from './pages/sign-in';
import { SignUpPage } from './pages/sign-up';

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/" />
      </SignedOut>
    </>
  );
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
                    <SignedIn>
                      <Navbar />
                    </SignedIn>
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
                    <SignedIn>
                      <Navbar />
                    </SignedIn>
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
