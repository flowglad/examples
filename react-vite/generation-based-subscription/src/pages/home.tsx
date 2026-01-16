import { useEffect, useState, useRef } from 'react';
import { authClient } from '../lib/auth-client';
import { useBilling } from '@flowglad/react';
import { computeUsageTotal } from '../lib/billing-helpers';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';

// Mock images to cycle through
const mockImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',
];

// Mock GIFs for video generation
const mockVideoGif = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd252Y2NwNG5vdmQxMXl6cWxsMWNpYzV0ZnU3a3UwbGhtcHFkZTNoMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a6OnFHzHgCU1O/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnNyOXhnNXp3cTJnaWw1OGZodXducHlzeThvbTBwdDc4cGw5OWFuZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WI4A2fVnRBiYE/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWN6emx1M2JpM3lkczB4Y2Y2M3U5ejgyNzNmbnJnM2ZqMDlvb3B4ciZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/pa37AAGzKXoek/giphy.gif',
];

export function HomePage() {
  const { data: session, isPending: isUserPending } = authClient.useSession();
  const billing = useBilling();
  
  // Extract current subscriptions using Flowglad's current flag
  const subscriptions = Array.isArray(billing?.subscriptions) ? billing.subscriptions : [];
  const currentSubscriptions = subscriptions.filter((s) => s?.current === true);
  
  const [isGeneratingFastImage, setIsGeneratingFastImage] = useState(false);
  const [isGeneratingHDVideo, setIsGeneratingHDVideo] = useState(false);
  const [isGeneratingRelaxImage, setIsGeneratingRelaxImage] = useState(false);
  const [isGeneratingRelaxSDVideo, setIsGeneratingRelaxSDVideo] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [hdVideoError, setHdVideoError] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [isLoadingFastTopUp, setIsLoadingFastTopUp] = useState(false);
  const [isLoadingHDTopUp, setIsLoadingHDTopUp] = useState(false);
  const [displayedContent, setDisplayedContent] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVideoGifIndex, setCurrentVideoGifIndex] = useState(0);
  const previousUserIdRef = useRef<string | undefined>(undefined);
  const [isReloadingAfterCheckout, setIsReloadingAfterCheckout] = useState(false);
  const [hasReloadedAfterCheckout, setHasReloadedAfterCheckout] = useState(false);
  // Manual usage adjustments when reload is not available
  const [manualUsageAdjustments, setManualUsageAdjustments] = useState({ fast_generations: 0, hd_video_minutes: 0 });
  
  // Reload billing data when returning from checkout (check URL params)
  useEffect(() => {
    const reloadAfterCheckout = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldReload = urlParams.has('checkout') || urlParams.has('session_id') || urlParams.has('success');
      
      if (shouldReload && !hasReloadedAfterCheckout) {
        // User returned from checkout, reload billing data
        if (typeof billing.reload === 'function' && billing.loaded && !isReloadingAfterCheckout) {
          setIsReloadingAfterCheckout(true);
          try {
            await billing.reload();
            setHasReloadedAfterCheckout(true);
          } catch {
            // Log but don't disrupt UX on reload failure
            console.error('Error reloading billing data after checkout');
          } finally {
            setIsReloadingAfterCheckout(false);
            // Clean up URL params after reload completes
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    };
    
    reloadAfterCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.reload, billing.loaded, billing.purchases, isReloadingAfterCheckout, hasReloadedAfterCheckout, currentSubscriptions.length]);

  // Refetch billing data when user ID changes
  useEffect(() => {
    const currentUserId = session?.user?.id;
    if (
      currentUserId &&
      currentUserId !== previousUserIdRef.current &&
      billing.loaded &&
      typeof billing.reload === 'function'
    ) {
      previousUserIdRef.current = currentUserId;
      billing.reload().catch(() => {
         // Log but don't disrupt UX on reload failure
         console.error('Error reloading billing data after user change');
        });
    } else if (currentUserId) {
      previousUserIdRef.current = currentUserId;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, billing.loaded, billing.reload]);


  if (isUserPending || !billing.loaded) {
    return <DashboardSkeleton />;
  }

  // Use catalog as fallback since pricingModel might be undefined
  const pricingModel = billing.pricingModel || billing.catalog;
  
  // Only show skeleton if billing explicitly failed or if we don't have a pricing model
  // Allow loadBilling to be truthy (not just strictly true) to be more lenient
  if (
    !billing.loadBilling ||
    billing.errors !== null ||
    !pricingModel
  ) {
    return <DashboardSkeleton />;
  }

  const currentSubscription = currentSubscriptions[0];
  const planName = currentSubscription?.name || 'Unknown Plan';

  // Helper functions to access usage balance and feature access if functions aren't available
  const getUsageBalance = (usageMeterSlug: string) => {
    // Fallback: manually access from subscription data
    if (currentSubscription?.experimental?.usageMeterBalances) {
      const balance = currentSubscription.experimental.usageMeterBalances.find(
        (meter) => meter.slug === usageMeterSlug
      );
      return balance ? { availableBalance: balance.availableBalance } : null;
    }
    return null;
  };

  const getFeatureAccess = (featureSlug: string) => {
    // Fallback: manually check from subscription feature items
    if (currentSubscription?.experimental?.featureItems) {
      return currentSubscription.experimental.featureItems.some(
        (item) => item.slug === featureSlug
      );
    }
    return false;
  };

  // Use billing functions if available, otherwise use fallback helpers
  const checkUsageBalance = billing.checkUsageBalance || getUsageBalance;
  const checkFeatureAccess = billing.checkFeatureAccess || getFeatureAccess;

  // Only show skeleton if we don't have a subscription to work with
  if (!currentSubscription && (!billing.checkUsageBalance || !billing.checkFeatureAccess)) {
    return <DashboardSkeleton />;
  }

  const fastGenerationsBalance = checkUsageBalance('fast_generations');
  const hdVideoMinutesBalance = checkUsageBalance('hd_video_minutes');

  // Apply manual adjustments if reload is not available
  const adjustedFastGenerationsBalance = fastGenerationsBalance 
    ? { availableBalance: Math.max(0, fastGenerationsBalance.availableBalance - manualUsageAdjustments.fast_generations) }
    : null;
  const adjustedHdVideoMinutesBalance = hdVideoMinutesBalance
    ? { availableBalance: Math.max(0, hdVideoMinutesBalance.availableBalance - manualUsageAdjustments.hd_video_minutes) }
    : null;

  const hasFastGenerationsAccess = adjustedFastGenerationsBalance != null;
  const hasHDVideoMinutesAccess = adjustedHdVideoMinutesBalance != null;

  const hasRelaxMode = !!checkFeatureAccess('unlimited_relaxed_images');
  const hasUnlimitedRelaxedSDVideo = !!checkFeatureAccess(
    'unlimited_relaxed_sd_video'
  );
  const hasOptionalTopUps = !!checkFeatureAccess(
    'optional_credit_top_ups'
  );

  const fastGenerationsRemaining = adjustedFastGenerationsBalance?.availableBalance ?? 0;

  const fastGenerationsTotal = computeUsageTotal(
    'fast_generations',
    currentSubscription,
    pricingModel
  );
  const fastGenerationsProgress =
    fastGenerationsTotal > 0
      ? Math.min((fastGenerationsRemaining / fastGenerationsTotal) * 100, 100)
      : 0;

  const hdVideoMinutesRemaining = adjustedHdVideoMinutesBalance?.availableBalance ?? 0;
  const hdVideoMinutesTotal = computeUsageTotal(
    'hd_video_minutes',
    currentSubscription,
    pricingModel
  );
  const hdVideoMinutesProgress =
    hdVideoMinutesTotal > 0
      ? Math.min((hdVideoMinutesRemaining / hdVideoMinutesTotal) * 100, 100)
      : 0;

  // Build request headers for API calls
  const getRequestHeaders = () => ({
    'Content-Type': 'application/json',
  });

  const handleGenerateFastImage = async () => {
    if (!hasFastGenerationsAccess || fastGenerationsRemaining === 0) {
      return;
    }

    setIsGeneratingFastImage(true);
    setGenerateError(null);

    try {
      const transactionId = `fast_image_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const amount = Math.floor(Math.random() * 3) + 3;

      const response = await fetch('/api/usage-events', {
        method: 'POST',
        headers: getRequestHeaders(),
        credentials: 'include', // Include cookies for Better Auth session
        body: JSON.stringify({
          usageMeterSlug: 'fast_generations',
          amount,
          transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create usage event');
      }

      const nextIndex = (currentImageIndex + 1) % mockImages.length;
      setCurrentImageIndex(nextIndex);
      const nextImage = mockImages[nextIndex];
      if (nextImage) {
        setDisplayedContent(nextImage);
      }

      // Apply manual adjustment immediately for instant UI update
      setManualUsageAdjustments(prev => ({
        ...prev,
        fast_generations: prev.fast_generations + amount
      }));
      
      // Try to reload billing data - if successful, it will update and override adjustments
      if (billing.reload) {
        try {
          await billing.reload();
          // Reset adjustments after reload to sync with server data
          setManualUsageAdjustments(prev => ({
            ...prev,
            fast_generations: 0
          }));
        } catch {
          // Keep manual adjustments if reload fails
        }
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : 'Failed to generate image. Please try again.'
      );
    } finally {
      setIsGeneratingFastImage(false);
    }
  };

  const handleGenerateHDVideo = async () => {
    if (!hasHDVideoMinutesAccess || hdVideoMinutesRemaining === 0) {
      return;
    }

    setIsGeneratingHDVideo(true);
    setHdVideoError(null);

    try {
      const transactionId = `hd_video_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const amount = Math.floor(Math.random() * 3) + 1;

      const response = await fetch('/api/usage-events', {
        method: 'POST',
        headers: getRequestHeaders(),
        credentials: 'include', // Include cookies for Better Auth session
        body: JSON.stringify({
          usageMeterSlug: 'hd_video_minutes',
          amount,
          transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create usage event');
      }

      const nextIndex = (currentVideoGifIndex + 1) % mockVideoGif.length;
      setCurrentVideoGifIndex(nextIndex);
      const nextGif = mockVideoGif[nextIndex];
      if (nextGif) {
        setDisplayedContent(nextGif);
      }

      // Apply manual adjustment immediately for instant UI update
      setManualUsageAdjustments(prev => ({
        ...prev,
        hd_video_minutes: prev.hd_video_minutes + amount
      }));
      
      // Try to reload billing data - if successful, it will update and override adjustments
      if (billing.reload) {
        try {
          await billing.reload();
          // Reset adjustments after reload to sync with server data
          setManualUsageAdjustments(prev => ({
            ...prev,
            hd_video_minutes: 0
          }));
        } catch {
          // Keep manual adjustments if reload fails
        }
      }
    } catch (error) {
      setHdVideoError(
        error instanceof Error
          ? error.message
          : 'Failed to generate HD video. Please try again.'
      );
    } finally {
      setIsGeneratingHDVideo(false);
    }
  };

  const handleGenerateRelaxImage = async () => {
    if (!hasRelaxMode) {
      return;
    }

    setIsGeneratingRelaxImage(true);

    try {
      const nextIndex = (currentImageIndex + 1) % mockImages.length;
      setCurrentImageIndex(nextIndex);
      const nextImage = mockImages[nextIndex];
      if (nextImage) {
        setDisplayedContent(nextImage);
      }
    } finally {
      setIsGeneratingRelaxImage(false);
    }
  };

  const handleGenerateRelaxSDVideo = async () => {
    if (!hasUnlimitedRelaxedSDVideo) {
      return;
    }

    setIsGeneratingRelaxSDVideo(true);

    try {
      const nextIndex = (currentVideoGifIndex + 1) % mockVideoGif.length;
      setCurrentVideoGifIndex(nextIndex);
      const nextGif = mockVideoGif[nextIndex];
      if (nextGif) {
        setDisplayedContent(nextGif);
      }
    } finally {
      setIsGeneratingRelaxSDVideo(false);
    }
  };

  const handlePurchaseFastGenerationTopUp = async () => {
    setTopUpError(null);

    // Check if billing is ready
    if (!billing.loaded || !billing.loadBilling) {
      setTopUpError('Billing data not loaded. Please refresh the page.');
      return;
    }

    // Get price using SDK
    const priceObj = billing.getPrice('fast_generation_top_up');
    if (!priceObj) {
      setTopUpError('Price not found. Please contact support.');
      return;
    }

    setIsLoadingFastTopUp(true);
    try {
      // Use createCheckoutSession exactly like pricing card
      if (!billing.createCheckoutSession) {
        throw new Error('Checkout not available');
      }
      await billing.createCheckoutSession({
        priceId: priceObj.id,
        successUrl: `${window.location.origin}${window.location.pathname}?checkout=success`,
        cancelUrl: window.location.href,
        quantity: 1,
        autoRedirect: true,
      });
    } catch (error) {
      setTopUpError(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout. Please try again.'
      );
    } finally {
      setIsLoadingFastTopUp(false);
    }
  };

  const handlePurchaseHDVideoTopUp = async () => {
    setTopUpError(null);

    // Check if billing is ready
    if (!billing.loaded || !billing.loadBilling) {
      setTopUpError('Billing data not loaded. Please refresh the page.');
      return;
    }

    // Get price using SDK
    const priceObj = billing.getPrice('hd_video_minute_top_up');
    if (!priceObj) {
      setTopUpError('Price not found. Please contact support.');
      return;
    }

    setIsLoadingHDTopUp(true);
    try {
      // Use createCheckoutSession exactly like pricing card
      if (!billing.createCheckoutSession) {
        throw new Error('Checkout not available');
      }
      await billing.createCheckoutSession({
        priceId: priceObj.id,
        successUrl: `${window.location.origin}${window.location.pathname}?checkout=success`,
        cancelUrl: window.location.href,
        quantity: 1,
        autoRedirect: true,
      });
    } catch (error) {
      setTopUpError(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout. Please try again.'
      );
    } finally {
      setIsLoadingHDTopUp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex min-h-screen w-full max-w-7xl flex-col p-8">
        <div className="w-full space-y-8">
          {/* Image Display Area with Action Buttons */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Current Plan: {planName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Display Area - Standardized 16:9 aspect ratio */}
              <div className="relative w-full aspect-video bg-muted rounded-lg border-2 border-dashed overflow-hidden">
                {/* Loading spinner overlay */}
                {isGeneratingFastImage ||
                isGeneratingHDVideo ||
                isGeneratingRelaxImage ||
                isGeneratingRelaxSDVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Generating...
                      </p>
                    </div>
                  </div>
                ) : null}
                {displayedContent ? (
                  <img
                    src={displayedContent}
                    alt="Generated content"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      Generate an image or video to see it here!
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-6">
                {/* Primary Generation Actions */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Primary Generation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Generate Fast Image */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handleGenerateFastImage}
                            className="w-full transition-transform hover:-translate-y-px"
                            size="lg"
                            disabled={
                              !hasFastGenerationsAccess ||
                              fastGenerationsRemaining === 0 ||
                              isGeneratingFastImage
                            }
                          >
                            {isGeneratingFastImage
                              ? 'Generating...'
                              : 'Generate Fast Image'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {(!hasFastGenerationsAccess ||
                        fastGenerationsRemaining === 0) && (
                        <TooltipContent>
                          {!hasFastGenerationsAccess
                            ? 'Not available in your plan'
                            : 'No credits remaining'}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    {generateError && (
                      <p className="text-sm text-destructive mt-2">
                        {generateError}
                      </p>
                    )}

                    {/* Generate HD Video */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handleGenerateHDVideo}
                            className="w-full transition-transform hover:-translate-y-px"
                            size="lg"
                            disabled={
                              !hasHDVideoMinutesAccess ||
                              hdVideoMinutesRemaining === 0 ||
                              isGeneratingHDVideo
                            }
                          >
                            {isGeneratingHDVideo
                              ? 'Generating...'
                              : 'Generate HD Video'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {(!hasHDVideoMinutesAccess ||
                        hdVideoMinutesRemaining === 0) && (
                        <TooltipContent>
                          {!hasHDVideoMinutesAccess
                            ? 'Not available in your plan'
                            : 'No credits remaining'}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    {hdVideoError && (
                      <p className="text-sm text-destructive mt-2">
                        {hdVideoError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Relax Mode Actions */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Relax Mode (Unlimited)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Generate Relax Mode Image */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handleGenerateRelaxImage}
                            variant="outline"
                            className="w-full transition-transform hover:-translate-y-px"
                            disabled={!hasRelaxMode || isGeneratingRelaxImage}
                          >
                            {isGeneratingRelaxImage
                              ? 'Generating...'
                              : 'Generate Relax Image'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!hasRelaxMode && (
                        <TooltipContent>
                          Not available in your plan
                        </TooltipContent>
                      )}
                    </Tooltip>

                    {/* Generate Relax Mode SD Video */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handleGenerateRelaxSDVideo}
                            variant="outline"
                            className="w-full transition-transform hover:-translate-y-px"
                            disabled={
                              !hasUnlimitedRelaxedSDVideo ||
                              isGeneratingRelaxSDVideo
                            }
                          >
                            {isGeneratingRelaxSDVideo
                              ? 'Generating...'
                              : 'Generate Relax SD Video'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!hasUnlimitedRelaxedSDVideo && (
                        <TooltipContent>
                          Not available in your plan
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>

                {/* Credit Top-Ups */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Purchase Additional Credits
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fast Generation Top-Up */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handlePurchaseFastGenerationTopUp}
                            variant="secondary"
                            className="w-full transition-transform hover:-translate-y-px"
                            disabled={
                              !hasOptionalTopUps ||
                              !billing.loaded ||
                              !billing.loadBilling ||
                              billing.errors !== null ||
                              isLoadingFastTopUp
                            }
                          >
                            {isLoadingFastTopUp ? 'Loading...' : 'Buy Fast Generations ($4.00 for 80)'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!hasOptionalTopUps ? (
                        <TooltipContent>
                          Not available in your plan
                        </TooltipContent>
                      ) : (!billing.loaded || !billing.loadBilling || billing.errors !== null) ? (
                        <TooltipContent>
                          Checkout is loading, please wait...
                        </TooltipContent>
                      ) : null}
                    </Tooltip>

                    {/* HD Video Minute Top-Up */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            onClick={handlePurchaseHDVideoTopUp}
                            variant="secondary"
                            className="w-full transition-transform hover:-translate-y-px"
                            disabled={
                              !hasOptionalTopUps ||
                              !billing.loaded ||
                              !billing.loadBilling ||
                              billing.errors !== null ||
                              isLoadingHDTopUp
                            }
                          >
                            {isLoadingHDTopUp ? 'Loading...' : 'Buy HD Video Minutes ($10.00 for 10 min)'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!hasOptionalTopUps ? (
                        <TooltipContent>
                          Not available in your plan
                        </TooltipContent>
                      ) : (!billing.loaded || !billing.loadBilling || billing.errors !== null) ? (
                        <TooltipContent>
                          Checkout is loading, please wait...
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                    {topUpError && (
                      <p className="text-sm text-destructive mt-2">
                        {topUpError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage Meters */}
              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Usage Meters
                </h3>
                <div className="space-y-6">
                  {/* Fast Generations Meter */}
                  {(hasFastGenerationsAccess ||
                    fastGenerationsRemaining > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Fast Generations
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {fastGenerationsRemaining}
                          {fastGenerationsTotal > 0
                            ? `/${fastGenerationsTotal}`
                            : ''}{' '}
                          credits
                        </span>
                      </div>
                      <Progress
                        key={`fast-${fastGenerationsRemaining}-${fastGenerationsTotal}`}
                        value={
                          fastGenerationsTotal > 0 ? fastGenerationsProgress : 0
                        }
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* HD Video Minutes Meter */}
                  {(hasHDVideoMinutesAccess || hdVideoMinutesRemaining > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          HD Video Minutes
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {hdVideoMinutesRemaining}
                          {hdVideoMinutesTotal > 0
                            ? `/${hdVideoMinutesTotal}`
                            : ''}{' '}
                          minutes
                        </span>
                      </div>
                      <Progress value={hdVideoMinutesTotal > 0 ? hdVideoMinutesProgress : 0} className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

