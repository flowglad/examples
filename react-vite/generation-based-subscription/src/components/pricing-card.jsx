import { useState } from 'react';
import { Check } from 'lucide-react';
import { useBilling } from '@flowglad/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { isDefaultPlanBySlug } from '../lib/billing-helpers';

/**
 * PricingCard component displays a single pricing plan
 */
export function PricingCard({ plan, isCurrentPlan = false, hideFeatures = false }) {
  const billing = useBilling();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!billing.loaded) {
    return <div>Loading...</div>;
  }

  if (billing.errors) {
    return <div>Error loading billing data</div>;
  }

  if (!billing.loadBilling) {
    return <div>Billing not available</div>;
  }

  const priceSlug = plan.slug;
  const displayPrice = plan.displayPrice;
  
  // Check if this plan is a default plan
  const pricingModel = billing.pricingModel || billing.catalog;
  const isDefaultPlan = isDefaultPlanBySlug(pricingModel, priceSlug);

  const handleCheckout = async () => {
    setError(null);

    // Get price using SDK or fallback
    const getPrice = (slug) => {
      if (billing.getPrice) return billing.getPrice(slug);
      const pricingModel = billing.pricingModel || billing.catalog;
      if (!pricingModel?.products) return null;
      for (const product of pricingModel.products) {
        const price = product.prices?.find((p) => p.slug === slug);
        if (price) return price;
      }
      return null;
    };

    const priceObj = getPrice(priceSlug);
    if (!priceObj) {
      setError(`Price not found for "${priceSlug}". Please contact support.`);
      return;
    }

    setIsLoading(true);
    try {
      if (!billing.createCheckoutSession) {
        throw new Error('Checkout not available');
      }
      await billing.createCheckoutSession({
        priceId: priceObj.id,
        successUrl: `${window.location.origin}/pricing?checkout=success`,
        cancelUrl: window.location.href,
        quantity: 1,
        autoRedirect: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start checkout. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col transition-transform hover:-translate-y-px',
        plan.isPopular && 'border-primary shadow-lg',
        isCurrentPlan && 'border-2 border-primary'
      )}
    >
      {plan.isPopular && (
        <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="text-xs px-1.5 py-0">
            Popular
          </Badge>
        </div>
      )}

      <CardHeader className="px-3 py-3 md:px-6 md:py-4">
        <CardTitle className="text-lg md:text-2xl">{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription className="text-xs md:text-base mt-1">
            {plan.description}
          </CardDescription>
        )}
        <div className="mt-1 md:mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl md:text-4xl font-bold">
              {displayPrice}
            </span>
            <span className="text-muted-foreground text-xs md:text-sm">
              /month
            </span>
          </div>
        </div>
      </CardHeader>

      {!hideFeatures && (
        <CardContent className="flex-1 px-3 md:px-6 pt-0">
          <ul className="space-y-1.5 md:space-y-3">
            {plan.features.length === 0 ? (
              <li className="text-muted-foreground text-xs md:text-sm">
                No features included
              </li>
            ) : (
              plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5 md:gap-2">
                  <Check className="mt-0.5 h-3 w-3 md:h-4 md:w-4 shrink-0 text-primary" />
                  <span className="text-xs md:text-sm">{feature}</span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      )}

      <CardFooter className="px-3 py-3 md:px-6 md:py-4 mt-auto">
        <div className="w-full space-y-2">
          <Button
            className="w-full text-xs md:text-sm"
            variant={plan.isPopular ? 'default' : 'outline'}
            disabled={
              isCurrentPlan ||
              isDefaultPlan ||
              isLoading ||
              !billing.loaded ||
              !billing.createCheckoutSession ||
              !billing.getPrice
            }
            size="sm"
            onClick={handleCheckout}
          >
            {isLoading
              ? 'Loading...'
              : isCurrentPlan
                ? `Current Plan`
                : 'Get Started'}
          </Button>
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

