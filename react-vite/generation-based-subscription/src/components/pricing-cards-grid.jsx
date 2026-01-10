import { useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { PricingCard } from './pricing-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import { useMobile } from '../hooks/use-mobile';
import { useBilling } from '@flowglad/react';
import { Skeleton } from './ui/skeleton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from './ui/card';

/**
 * PricingCardsGrid component displays all pricing plans in a responsive grid or carousel
 */
export function PricingCardsGrid() {
  const billing = useBilling();
  const isMobile = useMobile();
  
  // Extract current subscriptions using Flowglad's current flag
  const subscriptions = Array.isArray(billing?.subscriptions) ? billing.subscriptions : [];
  const currentSubscriptions = subscriptions.filter((s) => s?.current === true);
  
  const autoplayPlugin = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
    })
  );
  
  // Build plans from pricingModel (or catalog as fallback)
  const pricingModel = billing.catalog;
  let plans = [];
  
  if (billing.loaded && billing.loadBilling && !billing.errors && pricingModel) {
    const { products } = pricingModel;

    // Filter products: subscription or single_payment type, active, not default/free
    const filteredProducts = products.filter((product) => {
      if (product.default === true) {
        return false;
      }

      const matchingPrice = product.prices.find(
        (price) => 
          (price.type === 'subscription' || price.type === 'single_payment') && 
          price.active === true
      );

      return !!matchingPrice;
    });

    // Transform products to plan format
    const transformedPlans = filteredProducts
      .map((product) => {
        const price = product.prices.find(
          (p) => 
            (p.type === 'subscription' || p.type === 'single_payment') && 
            p.active === true
        );

        if (!price || !price.slug) return null;

        const formatPrice = (cents) => {
          const dollars = cents / 100;
          return `$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        };

        const displayPrice = formatPrice(price.unitPrice);

        const featureNames =
          product.features
            .map((feature) => feature.name)
            .filter((name) => typeof name === 'string' && name.length > 0) ?? [];

        const plan = {
          name: product.name,
          displayPrice: displayPrice,
          slug: price.slug,
          features: featureNames,
        };

        if (product.description) {
          plan.description = product.description;
        }

        if (product.name === 'Pro') {
          plan.isPopular = true;
        }

        return plan;
      })
      .filter((plan) => plan !== null);

    // Sort by price
    plans = transformedPlans.sort((a, b) => {
      const getPriceValue = (priceStr) => {
        return parseFloat(priceStr.replace(/[$,]/g, '')) || 0;
      };
      return getPriceValue(a.displayPrice) - getPriceValue(b.displayPrice);
    });
  }

  // Get price using SDK function or fallback
  const getPrice = (slug) => {
    if (billing.getPrice) {
      return billing.getPrice(slug);
    }
    // Fallback: search through catalog/products
    const pricingModel =  billing.catalog;
    if (!pricingModel?.products) return null;
    for (const product of pricingModel.products) {
      const price = product.prices?.find((p) => p.slug === slug);
      if (price) return price;
    }
    return null;
  };

  // Define isPlanCurrent function
  const isPlanCurrent = (plan) => {
    if (!billing.loaded) return false;

    const price = getPrice(plan.slug);
    if (!price) return false;

    // Compare against current subscription priceIds
    const currentPriceIds = new Set(
      currentSubscriptions
        .map((s) => s?.priceId)
        .filter((id) => typeof id === 'string' && id.length > 0)
    );

    return currentPriceIds.has(price.id);
  };

  // Show error message if there are errors
  if (billing?.errors) {
    return (
      <div className="w-full space-y-8">
        <div className="text-center text-red-500">
          <p className="text-lg font-semibold">Error loading pricing plans</p>
          <p className="text-sm text-muted-foreground mt-2">
            {billing.errors instanceof Error
              ? billing.errors.message
              : 'Please try refreshing the page'}
          </p>
        </div>
      </div>
    );
  }

  // Show skeletons while loading
  if (!billing?.loaded || !billing?.loadBilling) {
    return (
      <div className="w-full space-y-8">
        {isMobile ? (
          <div className="px-4">
            <Carousel
              plugins={[autoplayPlugin.current]}
              className="w-full"
              opts={{
                align: 'start',
                loop: true,
              }}
            >
              <CarouselContent className="-ml-1">
                {[1, 2].map((i) => (
                  <CarouselItem key={i} className="pl-1 basis-1/2">
                    <div className="p-1 h-full">
                      <Card className="relative flex h-full flex-col">
                        <CardHeader className="px-3 py-3 md:px-6 md:py-4">
                          <Skeleton className="h-6 md:h-8 w-24 mb-2" />
                          <Skeleton className="h-4 md:h-5 w-32 mb-2" />
                          <div className="mt-1 md:mt-2">
                            <Skeleton className="h-8 md:h-10 w-20" />
                          </div>
                        </CardHeader>
                        <CardFooter className="px-3 py-3 md:px-6 md:py-4 mt-auto">
                          <Skeleton className="h-9 w-full" />
                        </CardFooter>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ) : (
          <div className="grid gap-6 auto-rows-fr md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="relative flex h-full flex-col">
                <CardHeader className="px-3 py-3 md:px-6 md:py-4">
                  <Skeleton className="h-6 md:h-8 w-24 mb-2" />
                  <Skeleton className="h-4 md:h-5 w-32 mb-2" />
                  <div className="mt-1 md:mt-2">
                    <Skeleton className="h-8 md:h-10 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-3 md:px-6 pt-0">
                  <ul className="space-y-1.5 md:space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <li key={j} className="flex items-start gap-1.5 md:gap-2">
                        <Skeleton className="h-3 w-3 md:h-4 md:w-4 mt-0.5 shrink-0 rounded-full" />
                        <Skeleton className="h-3 md:h-4 flex-1" />
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-3 py-3 md:px-6 md:py-4 mt-auto">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {plans.length === 0 ? (
        // Show skeleton cards when plans are loading
        isMobile ? (
          <div className="px-4">
            <Carousel
              plugins={[autoplayPlugin.current]}
              className="w-full"
              opts={{
                align: 'start',
                loop: true,
              }}
            >
              <CarouselContent className="-ml-1">
                {[1, 2].map((i) => (
                  <CarouselItem key={i} className="pl-1 basis-1/2">
                    <div className="p-1 h-full">
                      <Card className="relative flex h-full flex-col">
                        <CardHeader className="px-3 py-3 md:px-6 md:py-4">
                          <Skeleton className="h-6 md:h-8 w-24 mb-2" />
                          <Skeleton className="h-4 md:h-5 w-32 mb-2" />
                          <div className="mt-1 md:mt-2">
                            <Skeleton className="h-8 md:h-10 w-20" />
                          </div>
                        </CardHeader>
                        <CardFooter className="px-3 py-3 md:px-6 md:py-4 mt-auto">
                          <Skeleton className="h-9 w-full" />
                        </CardFooter>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ) : (
          <div className="grid gap-6 auto-rows-fr md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="relative flex h-full flex-col">
                <CardHeader className="px-3 py-3 md:px-6 md:py-4">
                  <Skeleton className="h-6 md:h-8 w-24 mb-2" />
                  <Skeleton className="h-4 md:h-5 w-32 mb-2" />
                  <div className="mt-1 md:mt-2">
                    <Skeleton className="h-8 md:h-10 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-3 md:px-6 pt-0">
                  <ul className="space-y-1.5 md:space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <li key={j} className="flex items-start gap-1.5 md:gap-2">
                        <Skeleton className="h-3 w-3 md:h-4 md:w-4 mt-0.5 shrink-0 rounded-full" />
                        <Skeleton className="h-3 md:h-4 flex-1" />
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-3 py-3 md:px-6 md:py-4 mt-auto">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )
      ) : isMobile ? (
        <div className="px-4">
          <Carousel
            plugins={[autoplayPlugin.current]}
            className="w-full"
            opts={{
              align: 'start',
              loop: true,
            }}
          >
            <CarouselContent className="-ml-1">
              {plans.map((plan) => (
                <CarouselItem key={plan.name} className="pl-1 basis-1/2">
                  <div className="p-1 h-full">
                    <PricingCard
                      plan={plan}
                      isCurrentPlan={isPlanCurrent(plan)}
                      hideFeatures={true}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      ) : (
        <div className="grid gap-6 auto-rows-fr md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              isCurrentPlan={isPlanCurrent(plan)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

