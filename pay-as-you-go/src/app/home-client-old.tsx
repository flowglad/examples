'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import { useBilling } from '@flowglad/nextjs';
import { computeUsageTotal } from '@/lib/billing-helpers';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const mockMessages = [
  'do nisi tempor do velit exercitation adipisicing enim minim ex labore reprehenderit reprehenderit id consequat ipsum tempor sint cillum eu et nostrud velit dolore quis',
  'cillum culpa nostrud qui reprehenderit sint enim officia ullamco duis culpa deserunt aliqua enim nulla nisi ex officia labore deserunt',
  'magna in ea labore fugiat excepteur voluptate qui aliquip ad',
];

export function HomeClient() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const billing = useBilling();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<string | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [messages, setMessages] = useState<
    Array<{ type: 'user' | 'assistant'; content: string }>
  >([]);
  const previousUserIdRef = useRef<string | undefined>(undefined);

  // Refetch billing data when user ID changes to prevent showing previous user's data
  useEffect(() => {
    const currentUserId = session?.user?.id;
    // Only refetch if user ID actually changed and billing is loaded
    if (
      currentUserId &&
      currentUserId !== previousUserIdRef.current &&
      billing.loaded &&
      billing.reload
    ) {
      previousUserIdRef.current = currentUserId;
      billing.reload();
    } else if (currentUserId) {
      // Update ref even if we don't reload (e.g., on initial mount)
      previousUserIdRef.current = currentUserId;
    }
  }, [session?.user?.id, billing]);

  // Check if user is on free plan and redirect to pricing page
  useEffect(() => {
    async function getThing() {
      if (isSessionPending || !billing.loaded) {
        return;
      }

      billing.subscriptions;

      const balance = billing.checkUsageBalance?.('message_credits');
      console.log('balance', balance);
      if (!billing.checkFeatureAccess?.('100_messages')) {
        console.log('no access');
        // await billing.createCheckoutSession?.({
        //   priceSlug: 'message_topup',
        //   successUrl: window.location.href,
        //   cancelUrl: window.location.href,
        //   quantity: 1,
        //   autoRedirect: true
        // });
      }
      console.log(
        'feature access',
        billing.checkFeatureAccess?.('100_messages')
      );
    }

    getThing();
  }, [isSessionPending, billing.loaded, billing.currentSubscriptions, router]);

  if (isSessionPending || !billing.loaded) {
    return <DashboardSkeleton />;
  }

  if (
    billing.loadBilling !== true ||
    billing.errors !== null ||
    !billing.pricingModel
  ) {
    return <DashboardSkeleton />;
  }

  // Get current subscription plan
  // By default, each customer can only have one active subscription at a time,
  // so accessing the first currentSubscriptions is sufficient.
  // Multiple subscriptions per customer can be enabled in dashboard > settings
  const currentSubscription = billing.currentSubscriptions?.[0];
  const planName = currentSubscription?.name || 'Unknown Plan';

  if (!billing.checkUsageBalance || !billing.checkFeatureAccess) {
    return <DashboardSkeleton />;
  }

  const messageGenerationBalance = billing.checkUsageBalance('message_credits');

  // Check if user has access to usage meters (has balance object, even if balance is 0)
  const hasMessageGenerationAccess = messageGenerationBalance != null;

  // Calculate progress for usage meters - get slug from price using priceId
  const messageGenerationsRemaining =
    messageGenerationBalance?.availableBalance ?? 0;

  // Compute plan totals dynamically from current subscription's feature items
  // This calculates how many usage credits (e.g., "360 fast generations")
  // are included in the current subscription plan
  const messageGenerationsTotal = computeUsageTotal(
    'fast_generations',
    currentSubscription,
    billing.pricingModel
  );
  const messageGenerationsProgress =
    messageGenerationsTotal > 0
      ? Math.min(
          (messageGenerationsRemaining / messageGenerationsTotal) * 100,
          100
        )
      : 0;

  // Action handlers
  const handleGenerateMessage = async () => {
    if (!hasMessageGenerationAccess || messageGenerationsRemaining === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Generate a unique transaction ID for idempotency
      const transactionId = `message_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const response = await fetch('/api/usage-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usageMeterSlug: 'fast_generations',
          amount: 1,
          transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create usage event');
      }

      // Cycle through mock images
      const nextIndex = (currentMessageIndex + 1) % mockMessages.length;
      setCurrentMessageIndex(nextIndex);
      const nextMessage = mockMessages[nextIndex];
      if (nextMessage) {
        setMessages([
          ...messages,
          {
            type: 'assistant',
            content: nextMessage,
          },
        ]);
      }

      // Reload billing data to update usage balances
      await billing.reload();
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : 'Failed to generate message. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePurchaseMessageTopUp = async () => {
    if (!billing.createCheckoutSession || !billing.getPrice) {
      return;
    }

    setTopUpError(null);

    const price = billing.getPrice('message_topup');
    if (!price) {
      setTopUpError('Price not found. Please contact support.');
      return;
    }

    try {
      await billing.createCheckoutSession({
        priceId: price.id,
        successUrl: window.location.href,
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
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex min-h-screen w-full max-w-7xl flex-col p-8">
        <div className="w-full space-y-8">
          {/* Image Display Area with Action Buttons */}
          <Card className="max-w-2xl mx-auto h-[100%]">
            <CardHeader>
              <CardTitle>Current Plan: {planName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Usage Meters */}
              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Usage Meters
                </h3>
                <div className="space-y-6">
                  {/* Message Generations Meter */}
                  {/* Show if user has access OR if we have a balance (even if total is 0, show remaining) */}
                  {(hasMessageGenerationAccess ||
                    messageGenerationsRemaining > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Messasge Generations
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {messageGenerationsRemaining}
                          {messageGenerationsTotal > 0
                            ? `/${messageGenerationsTotal}`
                            : ''}{' '}
                          credits
                        </span>
                      </div>
                      <Progress
                        value={
                          messageGenerationsTotal > 0
                            ? messageGenerationsProgress
                            : 0
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* Credit Top-Ups */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Purchase Additional Messages (Credits)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 100 Messages Top-Up */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          onClick={handlePurchaseMessageTopUp}
                          variant="secondary"
                          className="w-full transition-transform hover:-translate-y-px"
                        >
                          Buy Messages ($100.00 for 100)
                        </Button>
                      </span>
                    </TooltipTrigger>
                  </Tooltip>

                  {topUpError && (
                    <p className="text-sm text-destructive mt-2">
                      {topUpError}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    className={cn(
                      'w-full flex ',
                      m.type == 'assistant' ? 'justify-start ' : 'justify-end'
                    )}
                  >
                    <p
                      className={cn(
                        'max-w-1/2 w-fit',
                        m.type == 'assistant'
                          ? 'bg-neutral-200 text-black'
                          : 'bg-neutral-800 text-white'
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="h- border border-red-500 min-h-[200px]"></div>

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
                            onClick={handleGenerateMessage}
                            className="w-full transition-transform hover:-translate-y-px"
                            size="lg"
                            disabled={
                              !hasMessageGenerationAccess ||
                              messageGenerationsRemaining === 0 ||
                              isGenerating
                            }
                          >
                            {isGenerating
                              ? 'Generating...'
                              : 'Generate Fast Image'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {(!hasMessageGenerationAccess ||
                        messageGenerationsRemaining === 0) && (
                        <TooltipContent>
                          {!hasMessageGenerationAccess
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
