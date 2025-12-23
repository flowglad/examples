'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useBilling } from '@flowglad/nextjs';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
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
  const autoScrollDiv = useRef<HTMLDivElement>(null); // ref for auto scrolling chat

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

  // whenever chat history changes, scroll to bottom of chat thread
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

  // Get current subscription plan (free plan since that's the default and only plan)
  const currentSubscription = billing.currentSubscriptions?.[0];
  const planName = currentSubscription?.name || 'Unknown Plan';

  if (!billing.checkUsageBalance || !billing.checkFeatureAccess) {
    return <DashboardSkeleton />;
  }

  // Number of credits a user has left, if any, using usage meter slug
  const messageGenerationsRemaining =
    billing.checkUsageBalance('message_credits')?.availableBalance ?? 0;

  // Action handlers
  const handleGenerateMessage = async () => {
    if (!messageInput || messageGenerationsRemaining === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    setMessages((msgs) => [
      ...msgs,
      {
        type: 'user',
        content: messageInput || '',
      },
    ]);

    setMessageInput(null);

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

      // Cycle through mock messages
      const nextIndex = (currentMessageIndex + 1) % mockMessages.length;
      setCurrentMessageIndex(nextIndex);
      const nextMessage = mockMessages[nextIndex];
      if (nextMessage) {
        // add user message again and add response to the chat history (avoids double state update problem)
        setMessages((msgs) => [
          ...msgs,
          {
            type: 'assistant',
            content: nextMessage,
          },
        ]);
      }

      // Reload billing data to update usage balances
      await billing.reload();
    } catch (error) {
      // remove user message from chat history
      setMessages((msgs) => msgs.slice(0, -1));
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
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Current Plan: {planName}</CardTitle>
              {/* Usage Meters */}
              {messageGenerationsRemaining > 0 && (
                <div className="space-y-2 pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Usage Meters
                  </h3>
                  <div className="space-y-6">
                    {/* Message Generations Meter */}
                    {/* Show if user has access OR if we have a balance (show remaining) */}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Message Generations
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {messageGenerationsRemaining} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Credit Top-Ups */}
              <div>
                <div className="w-full mt-2">
                  {/* 100 Messages Top-Up */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          onClick={handlePurchaseMessageTopUp}
                          variant={
                            messageGenerationsRemaining === 0
                              ? 'default'
                              : 'secondary'
                          }
                          className="w-full transition-transform hover:-translate-y-px"
                        >
                          Purchase{' '}
                          {messageGenerationsRemaining === 0
                            ? ''
                            : 'Additional'}{' '}
                          Messages ($100.00 for 100)
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
                      'w-full flex',
                      m.type === 'assistant' ? 'justify-start ' : 'justify-end'
                    )}
                  >
                    <p
                      className={cn(
                        'w-fit max-w-[50%] wrap-anywhere py-2 px-3 rounded-md text-sm',
                        m.type === 'assistant'
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
                              messageGenerationsRemaining === 0 || isGenerating
                            }
                          >
                            {isGenerating ? 'Generating...' : 'Generate'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {messageGenerationsRemaining === 0 && (
                        <TooltipContent>No Credits Remaining</TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                  {generateError && (
                    <p className="text-sm text-destructive mt-2">
                      {generateError}
                    </p>
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
