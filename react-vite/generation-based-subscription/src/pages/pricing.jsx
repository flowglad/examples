import { useEffect, useState } from 'react';
import { PricingCardsGrid } from '../components/pricing-cards-grid';
import { useBilling } from '@flowglad/react';

export function PricingPage() {
  const billing = useBilling();
  const [isReloading, setIsReloading] = useState(false);
  const [hasReloaded, setHasReloaded] = useState(false);
  
  // Log billing state
  useEffect(() => {
    console.log('PricingPage - billing state:', {
      loaded: billing.loaded,
      loadBilling: billing.loadBilling,
      hasReload: !!billing.reload,
      hasErrors: !!billing.errors,
      errors: billing.errors,
      currentSubscriptionsLength: billing.currentSubscriptions?.length || 0,
      purchasesLength: billing.purchases?.length || 0,
    });
  }, [billing]);
  
  /**
   * Reload billing data after successful checkout
   * 
   * This effect checks for URL parameters (checkout, session_id, or success) that indicate
   * the user just returned from a successful checkout. When detected, it:
   * 1. Calls billing.reload() to fetch the latest subscription/purchase data
   * 2. Updates the hasReloaded flag to prevent duplicate reloads
   * 3. Cleans up the URL parameters after reload completes
   * 
   * This ensures that the "Current Plan" button is shown immediately after purchase.
   */
  useEffect(() => {
    const reloadAfterCheckout = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldReload = urlParams.has('checkout') || urlParams.has('session_id') || urlParams.has('success');
      
      if (shouldReload && !hasReloaded) {
        // User returned from checkout, reload billing data
        if (billing.reload && billing.loaded && !isReloading) {
          setIsReloading(true);
          try {
            await billing.reload();
            console.log('   New state:', {
              currentSubscriptionsLength: billing.currentSubscriptions?.length || 0,
              purchasesLength: billing.purchases?.length || 0,
            });
            setHasReloaded(true);
          } catch (error) {
            console.error(' PricingPage: Error reloading billing data:', error);
          } finally {
            setIsReloading(false);
            // Clean up URL params after reload completes
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    };
    
    reloadAfterCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.reload, billing.loaded, isReloading, hasReloaded]);
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="flex min-h-screen w-full max-w-7xl flex-col items-center p-8">
        <div className="w-full space-y-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
              Choose Your Plan
            </h1>
            <p className="text-lg leading-8 text-muted-foreground md:text-xl">
              Select the perfect plan for your AI generation needs
            </p>
          </div>
          <PricingCardsGrid />
        </div>
      </main>
    </div>
  );
}