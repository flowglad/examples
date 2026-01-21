'use client'

import { useBilling } from '@flowglad/nextjs'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  getFreePlan,
  groupProductsByTier,
  type PlanTier,
} from '@/lib/billing-helpers'
import { cn } from '@/lib/utils'

// Curated feature lists for cleaner display
const FEATURE_HIGHLIGHTS: Record<string, string[]> = {
  Free: [
    'Unlimited members',
    '250 issues',
    'Slack & GitHub integration',
    'AI agents & MCP access',
    'API & webhooks',
    'Import & export',
  ],
  Basic: [
    'Everything in Free',
    'Unlimited issues',
    'Unlimited file uploads',
    'Admin roles',
    'Customer requests',
    'Issue sync',
  ],
  Business: [
    'Everything in Basic',
    'Product Intelligence',
    'Linear Insights',
    'Linear Asks',
    'Support integrations',
    'Issue SLAs',
    'Triage routing',
  ],
  Enterprise: [
    'Everything in Business',
    'SAML SSO',
    'SCIM provisioning',
    'Advanced security',
    'Dashboards',
    'Migration support',
    'Priority support',
    'Dedicated account manager',
  ],
}

function PricingCardSkeleton() {
  return (
    <Card className="relative flex h-full flex-col">
      <CardHeader className="pb-4">
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-10 w-32" />
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}

interface PaidPlanCardProps {
  tier: PlanTier
  isYearly: boolean
  isCurrentPlan: boolean
  onSelect: (slug: string, quantity?: number) => void
  isLoading: boolean
}

function PaidPlanCard({
  tier,
  isYearly,
  isCurrentPlan,
  onSelect,
  isLoading,
}: PaidPlanCardProps) {
  const [quantity, setQuantity] = useState(1)

  const priceSlug = isYearly ? tier.yearlySlug : tier.monthlySlug
  const unitPrice = isYearly ? tier.yearlyPrice : tier.monthlyPrice
  const displayPrice = unitPrice / 100
  const period = isYearly ? '/year' : '/month'

  // Calculate yearly savings
  const yearlySavings = isYearly
    ? Math.round(
        ((tier.monthlyPrice * 12 - tier.yearlyPrice) /
          (tier.monthlyPrice * 12)) *
          100
      )
    : 0

  const features = FEATURE_HIGHLIGHTS[tier.name] ?? tier.features.slice(0, 8)

  const handleSelect = () => {
    if (!priceSlug) return
    onSelect(priceSlug, quantity)
  }

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col transition-all hover:shadow-lg',
        tier.isPopular && 'border-primary ring-1 ring-primary',
        isCurrentPlan && 'border-2 border-green-500'
      )}
    >
      {tier.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 pt-6">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription className="text-sm min-h-[40px]">
          {tier.isEnterprise
            ? 'For large teams with advanced needs'
            : tier.name === 'Basic'
              ? 'For small teams getting started'
              : 'For growing teams that need more'}
        </CardDescription>

        <div className="mt-4">
          {tier.isEnterprise ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">Custom</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">${displayPrice}</span>
              <span className="text-muted-foreground text-sm">
                per user{period}
              </span>
            </div>
          )}
          {isYearly && yearlySavings > 0 && !tier.isEnterprise && (
            <p className="text-xs text-green-600 mt-1">
              Save {yearlySavings}% with yearly billing
            </p>
          )}
        </div>

        {/* Quantity selector for non-enterprise */}
        {!tier.isEnterprise && !isCurrentPlan && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Users:</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setQuantity(Math.min(100, quantity + 1))}
                disabled={quantity >= 100}
              >
                +
              </Button>
            </div>
            {quantity > 1 && (
              <span className="text-sm text-muted-foreground">
                = ${(displayPrice * quantity).toLocaleString()}
                {period}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className="w-full"
          variant={tier.isPopular ? 'default' : 'outline'}
          onClick={handleSelect}
          disabled={isLoading || isCurrentPlan || !priceSlug}
        >
          {isLoading
            ? 'Loading...'
            : isCurrentPlan
              ? 'Current Plan'
              : tier.isEnterprise
                ? 'Contact Sales'
                : 'Get Started'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export function PricingClient() {
  const billing = useBilling()
  const [isYearly, setIsYearly] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tiers = groupProductsByTier(billing.pricingModel)
  const freePlan = getFreePlan(billing.pricingModel)

  const handleSelectPlan = async (priceSlug: string, quantity?: number) => {
    if (!billing.createCheckoutSession) return

    setIsCheckoutLoading(true)
    setError(null)

    try {
      await billing.createCheckoutSession({
        priceSlug,
        quantity: quantity ?? 1,
        successUrl: `${window.location.origin}/`,
        cancelUrl: window.location.href,
        autoRedirect: true,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start checkout'
      )
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const getCurrentPlanSlug = (): string | null => {
    const sub = billing.currentSubscriptions?.[0]
    if (!sub?.priceId || !billing.catalog) return null

    for (const product of billing.catalog.products) {
      const price = product.prices.find((p) => p.id === sub.priceId)
      if (price?.slug) return price.slug
    }
    return null
  }

  const currentPlanSlug = getCurrentPlanSlug()

  const isCurrentPlan = (tier: PlanTier): boolean => {
    if (!currentPlanSlug) return false
    return (
      currentPlanSlug === tier.monthlySlug ||
      currentPlanSlug === tier.yearlySlug
    )
  }

  if (!billing.loaded) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <PricingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as your team grows. All plans include
            unlimited members.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={cn(
              'text-sm font-medium',
              !isYearly && 'text-foreground',
              isYearly && 'text-muted-foreground'
            )}
          >
            Monthly
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span
            className={cn(
              'text-sm font-medium',
              isYearly && 'text-foreground',
              !isYearly && 'text-muted-foreground'
            )}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save up to 17%
            </Badge>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
          {/* Free Plan */}
          {freePlan && (
            <Card className="relative flex h-full flex-col">
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-xl">{freePlan.name}</CardTitle>
                <CardDescription className="text-sm min-h-[40px]">
                  For individuals and small projects
                </CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground text-sm">
                      forever
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-0">
                <ul className="space-y-2.5">
                  {FEATURE_HIGHLIGHTS.Free.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={
                    currentPlanSlug === freePlan.slug || isCheckoutLoading
                  }
                  onClick={() => handleSelectPlan(freePlan.slug)}
                >
                  {currentPlanSlug === freePlan.slug
                    ? 'Current Plan'
                    : 'Get Started Free'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Paid Plans */}
          {tiers.map((tier) => (
            <PaidPlanCard
              key={tier.name}
              tier={tier}
              isYearly={isYearly}
              isCurrentPlan={isCurrentPlan(tier)}
              onSelect={handleSelectPlan}
              isLoading={isCheckoutLoading}
            />
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 p-4 bg-destructive/10 border border-destructive rounded-lg text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include 14-day free trial. No credit card required to
            start.
          </p>
        </div>
      </div>
    </div>
  )
}
