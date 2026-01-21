import type {
  BillingWithChecks,
  Price,
  Product,
  UsageMeter,
} from '@flowglad/nextjs'
import type { PricingPlan } from '@/components/pricing-card'

type UsageMeterSlug = 'fast_generations' | 'hd_video_minutes'

/**
 * The product name used to determine the "popular" plan in pricing displays.
 * Change this constant to update the popular plan across all pricing grids.
 */
export const POPULAR_PLAN_NAME = 'Business'

/**
 * Plan tier definitions for Linear-style pricing display.
 * Used to group monthly/yearly variants and show appropriate features.
 */
export interface PlanTier {
  name: string
  monthlySlug: string | null
  yearlySlug: string | null
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  isPopular: boolean
  isEnterprise: boolean
  singularQuantityLabel?: string
  pluralQuantityLabel?: string
}

/**
 * Groups products by their base name (Basic, Business, Enterprise) and extracts
 * monthly/yearly pricing variants for Linear-style pricing display.
 */
export function groupProductsByTier(
  pricingModel: BillingWithChecks['pricingModel'] | null | undefined
): PlanTier[] {
  if (!pricingModel?.products) return []

  const { products } = pricingModel

  // Group products by base name
  const tierMap = new Map<string, PlanTier>()

  for (const product of products) {
    // Skip free/default products for paid tiers display
    if (product.default === true) continue

    const price = product.prices.find(
      (p) => p.type === 'subscription' && p.active === true
    )
    if (!price?.slug) continue

    const baseName = product.name // "Basic", "Business", "Enterprise"
    const isMonthly = price.intervalUnit === 'month'
    const isYearly = price.intervalUnit === 'year'

    // Get or create tier entry
    let tier = tierMap.get(baseName)
    if (!tier) {
      tier = {
        name: baseName,
        monthlySlug: null,
        yearlySlug: null,
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: product.description ?? '',
        features: product.features
          .map((f) => f.name)
          .filter((n): n is string => typeof n === 'string' && n.length > 0),
        isPopular: baseName === POPULAR_PLAN_NAME,
        isEnterprise: baseName === 'Enterprise',
        singularQuantityLabel: product.singularQuantityLabel ?? undefined,
        pluralQuantityLabel: product.pluralQuantityLabel ?? undefined,
      }
      tierMap.set(baseName, tier)
    }

    // Set pricing based on interval
    if (isMonthly) {
      tier.monthlySlug = price.slug
      tier.monthlyPrice = price.unitPrice
    } else if (isYearly) {
      tier.yearlySlug = price.slug
      tier.yearlyPrice = price.unitPrice
    }
  }

  // Convert to array and sort by monthly price
  const tiers = Array.from(tierMap.values())

  // Sort: Basic, Business, Enterprise
  const order = ['Basic', 'Business', 'Enterprise']
  return tiers.sort((a, b) => {
    const aIdx = order.indexOf(a.name)
    const bIdx = order.indexOf(b.name)
    if (aIdx === -1 && bIdx === -1) return a.monthlyPrice - b.monthlyPrice
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })
}

/**
 * Gets the Free plan details from the pricing model.
 */
export function getFreePlan(
  pricingModel: BillingWithChecks['pricingModel'] | null | undefined
): { name: string; description: string; features: string[]; slug: string } | null {
  if (!pricingModel?.products) return null

  const freeProduct = pricingModel.products.find((p) => p.default === true)
  if (!freeProduct) return null

  const price = freeProduct.prices.find((p) => p.type === 'subscription')
  if (!price?.slug) return null

  return {
    name: freeProduct.name,
    description: freeProduct.description ?? 'Free for everyone',
    features: freeProduct.features
      .map((f) => f.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0),
    slug: price.slug,
  }
}

/**
 * Formats a price from cents to a display string (e.g., 1000 -> "$10")
 */
export function formatPriceFromCents(cents: number): string {
  const dollars = cents / 100
  return `$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/**
 * Transforms products from the billing pricing model into PricingPlan objects
 * for display in pricing grids.
 *
 * This function:
 * - Filters out default/free products
 * - Finds active subscription prices
 * - Extracts feature names
 * - Marks the popular plan (based on POPULAR_PLAN_NAME constant)
 * - Sorts by price (lowest to highest)
 *
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns Array of PricingPlan objects sorted by price
 */
export function transformProductsToPricingPlans(
  pricingModel: BillingWithChecks['pricingModel'] | null | undefined
): PricingPlan[] {
  if (!pricingModel?.products) return []

  const { products } = pricingModel

  // Filter products: subscription type, active, not default/free
  const filteredProducts = products.filter((product) => {
    // Skip default/free products
    if (product.default === true) return false

    // Find active subscription price
    const matchingPrice = product.prices.find(
      (price) =>
        price.type === 'subscription' && price.active === true
    )

    return !!matchingPrice
  })

  // Transform products to PricingPlan format
  const transformedPlans = filteredProducts
    .map((product) => {
      const price = product.prices.find(
        (p) => p.type === 'subscription' && p.active === true
      )

      if (!price || !price.slug) return null

      const displayPrice = formatPriceFromCents(price.unitPrice)

      // Build features list from feature objects (features have name and description)
      const featureNames =
        product.features
          .map((feature) => feature.name)
          .filter(
            (name): name is string =>
              typeof name === 'string' && name.length > 0
          ) ?? []

      const plan: PricingPlan = {
        name: product.name,
        displayPrice: displayPrice,
        slug: price.slug,
        features: featureNames,
        unitPrice: price.unitPrice,
        singularQuantityLabel:
          product.singularQuantityLabel ?? undefined,
        pluralQuantityLabel: product.pluralQuantityLabel ?? undefined,
      }

      if (product.description) {
        plan.description = product.description
      }

      // Determine if popular (based on POPULAR_PLAN_NAME constant)
      if (product.name === POPULAR_PLAN_NAME) {
        plan.isPopular = true
      }

      return plan
    })
    .filter((plan): plan is PricingPlan => plan !== null)

  // Sort by price (lowest to highest)
  return transformedPlans.sort((a, b) => a.unitPrice - b.unitPrice)
}

/**
 * Computes the total usage credits for a given usage meter slug from the current subscription's feature items.
 *
 * This function extracts usage credit grants from the subscription's experimental.featureItems
 * and sums up the amounts for the specified usage meter.
 *
 * @param usageMeterSlug - The slug of the usage meter to compute totals for
 * @param currentSubscription - The current subscription object (from billing.currentSubscriptions[0])
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns The total amount of usage credits for the specified meter, or 0 if not found
 */
export function computeUsageTotal(
  usageMeterSlug: UsageMeterSlug,
  currentSubscription:
    | NonNullable<
        NonNullable<BillingWithChecks['currentSubscriptions']>[number]
      >
    | undefined,
  pricingModel: BillingWithChecks['pricingModel'] | undefined
): number {
  try {
    // Early returns if we don't have the necessary data
    if (!currentSubscription || !pricingModel?.usageMeters) return 0

    // Get feature items from subscription (stored in experimental.featureItems)
    const experimental = currentSubscription.experimental
    const featureItems = experimental?.featureItems ?? []

    if (featureItems.length === 0) return 0

    // Build a lookup map: usageMeterId -> slug
    // (Feature items reference meters by ID, but we need to match by slug)
    const usageMeterById: Record<string, string> = {}
    for (const meter of pricingModel.usageMeters) {
      const meterId = String(meter.id)
      const meterSlug = String(meter.slug)
      usageMeterById[meterId] = meterSlug
    }

    // Filter to only usage credit grant features that match our slug
    let total = 0
    for (const item of featureItems) {
      // Only process usage credit grants (not toggle features)
      if (item.type !== 'usage_credit_grant') continue

      // Check if this feature item's meter matches the slug we're looking for
      const meterSlug = usageMeterById[item.usageMeterId]
      if (meterSlug === usageMeterSlug) {
        total += item.amount
      }
    }

    return total
  } catch {
    return 0
  }
}

/**
 * Finds a usage meter by its slug from the pricing model.
 *
 * @param usageMeterSlug - The slug of the usage meter to find
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns The usage meter object with id and slug, or null if not found
 */
export function findUsageMeterBySlug(
  usageMeterSlug: string,
  pricingModel: BillingWithChecks['pricingModel'] | undefined
): { id: string; slug: string } | null {
  if (!pricingModel?.usageMeters) return null

  const usageMeter = pricingModel.usageMeters.find(
    (meter: UsageMeter) => meter.slug === usageMeterSlug
  )

  if (!usageMeter) {
    return null
  }

  return {
    id: String(usageMeter.id),
    slug: String(usageMeter.slug),
  }
}

/**
 * Finds a usage price by its associated usage meter slug from the pricing model.
 * Usage prices are now nested under usageMeters[].prices (not products[].prices).
 *
 * @param usageMeterSlug - The slug of the usage meter to find the price for
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns The usage price object, or null if not found
 */
export function findUsagePriceByMeterSlug(
  usageMeterSlug: string,
  pricingModel: BillingWithChecks['pricingModel'] | undefined
): Price | null {
  if (!pricingModel?.usageMeters) return null

  // Find the usage meter by slug
  const usageMeter = pricingModel.usageMeters.find(
    (meter: UsageMeter) => meter.slug === usageMeterSlug
  )
  if (!usageMeter) return null

  // Usage prices are now directly on the usage meter
  // Cast to access the prices property which is part of the new schema
  const meterWithPrices = usageMeter as UsageMeter & {
    prices?: Price[]
  }
  const usagePrice = meterWithPrices.prices?.find(
    (price: Price) => price.type === 'usage'
  )

  return usagePrice ?? null
}

/**
 * Checks if a plan is a default plan by looking up the price by slug.
 * Default plans have default: true at the product level.
 *
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @param priceSlug - The slug of the price to check
 * @returns true if the plan is a default plan, false otherwise
 */
export function isDefaultPlanBySlug(
  pricingModel: BillingWithChecks['pricingModel'] | null | undefined,
  priceSlug: string | undefined
): boolean {
  if (!pricingModel?.products || !priceSlug) return false

  for (const product of pricingModel.products) {
    const price = product.prices?.find(
      (p: Price) => p.slug === priceSlug
    )
    if (price) {
      // Check if the product is default (e.g., Free Plan)
      return product.default === true
    }
  }
  return false
}

/**
 * Checks if a subscription is a default plan by looking up the price by ID.
 * Default plans have default: true at the product level.
 * Only checks product.default, not price.isDefault (which is set for all subscription prices).
 *
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @param priceId - The ID of the price to check
 * @returns true if the plan is a default plan, false otherwise
 */
export function isDefaultPlanById(
  pricingModel: BillingWithChecks['pricingModel'] | null | undefined,
  priceId: string | undefined
): boolean {
  if (!pricingModel?.products || !priceId) return false

  for (const product of pricingModel.products) {
    const price = product.prices?.find((p: Price) => p.id === priceId)
    if (price) {
      return product.default === true
    }
  }
  return false
}
