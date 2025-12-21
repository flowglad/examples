'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import { useBilling } from '@flowglad/nextjs';
import { computeMessageUsageTotal } from '@/lib/billing-helpers';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const mockMessages = [
  'Hi! This is a sample message.',
  'Hey there, this is another sample message.',
  'Hello, this is a different sample message.',
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
  const autoScrollDiv = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    autoScrollDiv.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  const messageGenerationsTotal = computeMessageUsageTotal(
    billing.purchases,
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
    if (
      !messageInput ||
      !hasMessageGenerationAccess ||
      messageGenerationsRemaining === 0
    ) {
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
          usageMeterSlug: 'message_credits',
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
            type: 'user',
            content: messageInput,
          },
          {
            type: 'assistant',
            content: nextMessage,
          },
        ]);

        setMessageInput(null);
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
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Current Plan: {planName}</CardTitle>
              {/* Usage Meters */}
              <div className="space-y-2 pt-6">
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
                <div className="w-full mt-2">
                  {/* 100 Messages Top-Up */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          onClick={handlePurchaseMessageTopUp}
                          variant="secondary"
                          className="w-full transition-transform hover:-translate-y-px"
                        >
                          Purchase Additional Messages ($100.00 for 100)
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
            </CardHeader>

            <ScrollArea className="h-[300px] px-6 pt-4 border-t">
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-full flex ',
                      m.type == 'assistant' ? 'justify-start ' : 'justify-end'
                    )}
                  >
                    <p
                      className={cn(
                        'max-w-1/2 w-fit p-2 rounded-md',
                        m.type == 'assistant'
                          ? 'bg-secondary text-black'
                          : 'bg-primary text-white'
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
              <div ref={autoScrollDiv}></div>
            </ScrollArea>
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="space-y-6">
                {/* Primary Generation Actions */}
                <div>
                  <div className="flex items-center gap-4">
                    <Input
                      onChange={(e) => setMessageInput(e.target.value)}
                      value={messageInput || ''}
                      placeholder="Type something..."
                      className="flex-[0.75] w-full"
                    />
                    {/* Generate Message */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full flex-[0.25]">
                          <Button
                            onClick={handleGenerateMessage}
                            className="w-full transition-transform hover:-translate-y-px"
                            // size="sm"
                            disabled={
                              !hasMessageGenerationAccess ||
                              messageGenerationsRemaining === 0 ||
                              isGenerating
                            }
                          >
                            {isGenerating ? 'Generating...' : 'Generate'}
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
