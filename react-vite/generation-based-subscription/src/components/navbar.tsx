import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { useBilling } from '@flowglad/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import { Button } from './ui/button';

export function Navbar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const billing = useBilling();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUncancelling, setIsUncancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [uncancelError, setUncancelError] = useState<string | null>(null);
  if (!billing.loaded || !billing.loadBilling) {
    return null;
  }

  if (billing.errors) {
    return null;
  }

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/sign-in');
  }

  async function handleCancelSubscription() {
    // Get current subscription using the same pattern as other components
    const subscriptions = Array.isArray(billing?.subscriptions) ? billing.subscriptions : [];
    const currentSubscriptions = subscriptions.filter((s) => s?.current === true);
    const currentSubscription = currentSubscriptions[0] || billing.currentSubscriptions?.[0];
    const subscriptionId = currentSubscription?.id;

    if (!subscriptionId || !billing.cancelSubscription) {
      setCancelError('Cancellation is not available right now.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel your membership? Your subscription will remain active until the end of the current billing period.'
    );

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await billing.cancelSubscription({
        id: subscriptionId,
        cancellation: {
          timing: 'at_end_of_current_billing_period',
        },
      });
      
      // Reload billing data to reflect the updated subscription status
      if (typeof billing.reload === 'function') {
        await billing.reload();
      }
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : 'Failed to cancel subscription. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleUncancelSubscription() {
    // Get current subscription using the same pattern as other components
    const subscriptions = Array.isArray(billing?.subscriptions) ? billing.subscriptions : [];
    const currentSubscriptions = subscriptions.filter((s) => s?.current === true);
    const currentSubscription = currentSubscriptions[0] || billing.currentSubscriptions?.[0];
    const subscriptionId = currentSubscription?.id;

    if (!subscriptionId || !billing.uncancelSubscription) {
      setUncancelError('Uncancel is not available right now.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to keep your subscription? Your subscription will continue as normal.'
    );

    if (!confirmed) {
      return;
    }

    setIsUncancelling(true);
    setUncancelError(null);

    try {
      await billing.uncancelSubscription({
        id: subscriptionId,
      });
      
      // Reload billing data to reflect the updated subscription status
      if (typeof billing.reload === 'function') {
        await billing.reload();
      }
    } catch (error) {
      setUncancelError(
        error instanceof Error
          ? error.message
          : 'Failed to uncancel subscription. Please try again.'
      );
    } finally {
      setIsUncancelling(false);
    }
  }

  if (!session?.user) {
    return null;
  }

  const accountName = session.user.name || session.user.email || 'Account';
  
  // Get current subscription using the same pattern as other components
  const subscriptions = Array.isArray(billing?.subscriptions) ? billing.subscriptions : [];
  const currentSubscriptions = subscriptions.filter((s) => s?.current === true);
  const currentSubscription = currentSubscriptions[0] || billing.currentSubscriptions?.[0];

  const isCancelled =
    currentSubscription &&
    (currentSubscription.status === 'cancellation_scheduled' ||
      (currentSubscription.cancelScheduledAt &&
        !currentSubscription.canceledAt));

  const cancellationDate = currentSubscription?.cancelScheduledAt
    ? new Date(currentSubscription.cancelScheduledAt).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      )
    : null;

  return (
    <nav className="absolute top-0 right-0 flex justify-end items-center gap-4 p-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {accountName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[300px] !overflow-visible">
          <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/pricing')}>Pricing</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>Log out</DropdownMenuItem>
          {!currentSubscription?.isFreePlan && (
            <>
              {!isCancelled ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full block">
                        <DropdownMenuItem
                          onSelect={handleCancelSubscription}
                          disabled={Boolean(
                            isCancelling || 
                            isUncancelling || 
                            !currentSubscription || 
                            !billing.cancelSubscription
                          )}
                          className="text-destructive focus:text-destructive w-full"
                        >
                          {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                        </DropdownMenuItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent 
  className="w-[420px] max-w-[95vw] whitespace-normal break-words text-sm !z-[9999] pointer-events-none">
                      <p>
                        Your subscription will remain active until the end of the current billing period
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {cancelError && (
                    <DropdownMenuItem disabled className="text-destructive text-xs">
                      {cancelError}
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <DropdownMenuItem
                          onSelect={handleUncancelSubscription}
                          disabled={Boolean(
                            isUncancelling || 
                            isCancelling || 
                            !currentSubscription || 
                            !billing.uncancelSubscription
                          )}
                          className="text-green-600 focus:text-green-600"
                        >
                          {isUncancelling ? 'Uncancelling...' : 'Keep My Subscription'}
                        </DropdownMenuItem>
                      </span>
                    </TooltipTrigger>
                    {cancellationDate && (
                      <TooltipContent className="w-[420px] max-w-[95vw] whitespace-normal break-words text-sm !z-[9999] pointer-events-none">
                        <p>
                          Subscription is scheduled for cancellation on{' '}
                          {cancellationDate}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {uncancelError && (
                    <DropdownMenuItem disabled className="text-destructive text-xs">
                      {uncancelError}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}


