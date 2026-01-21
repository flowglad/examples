// Type definitions for Flowglad billing objects
type UsageMeterSlug = 'fast_generations' | 'hd_video_minutes';

interface UsageMeter {
  id: string | number;
  slug: string;
}

// Flexible Subscription type that accepts Flowglad's actual subscription types
type Subscription = {
  experimental?: {
    featureItems?: Array<{
      type?: string;
      usageMeterId?: string | number | null | undefined;
      amount?: number;
    }>;
  };
} | any;

interface Price {
  id?: string | number;
  slug?: string | null;
  type?: 'usage' | 'subscription' | string;
  usageMeterId?: string | number | null;
  unitPrice?: number;
}

interface Product {
  default?: boolean;
  prices?: Price[];
}

// Flexible PricingModel type that accepts Flowglad's actual types
type PricingModel = {
  usageMeters?: UsageMeter[];
  products?: Product[];
} | any;

/**
 * Computes the total usage credits for a given usage meter slug from the current subscription's feature items.
 *
 * @param usageMeterSlug - The slug of the usage meter to compute totals for
 * @param currentSubscription - The current subscription object
 * @param pricingModel - The billing pricing model
 * @returns The total amount of usage credits for the specified meter, or 0 if not found
 */
export function computeUsageTotal(
  usageMeterSlug: UsageMeterSlug | string,
  currentSubscription: Subscription | undefined | null,
  pricingModel: PricingModel | undefined | null
): number {
  try {
    if (!currentSubscription || !pricingModel?.usageMeters) return 0;

    const experimental = currentSubscription.experimental;
    const featureItems = experimental?.featureItems ?? [];

    if (featureItems.length === 0) return 0;

    // Build a lookup map: usageMeterId -> slug
    const usageMeterById: Record<string, string> = {};
    for (const meter of pricingModel.usageMeters) {
      const meterId = String(meter.id);
      const meterSlug = String(meter.slug);
      usageMeterById[meterId] = meterSlug;
    }

    // Filter to only usage credit grant features that match our slug
    let total = 0;
    for (const item of featureItems) {
      if (item.type !== 'usage_credit_grant') continue;

      const meterSlug = usageMeterById[item.usageMeterId];
      if (meterSlug === usageMeterSlug) {
        const amount = typeof item.amount === 'number' ? item.amount : 0;
        total += amount;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

/**
 * Finds a usage meter by its slug from the pricing model.
 *
 * @param usageMeterSlug - The slug of the usage meter to find
 * @param pricingModel - The billing pricing model
 * @returns The usage meter object with id and slug, or null if not found
 */
export function findUsageMeterBySlug(
  usageMeterSlug: string,
  pricingModel: PricingModel | undefined | null
): { id: string; slug: string } | null {
  if (!pricingModel?.usageMeters) return null;

  const usageMeter = pricingModel.usageMeters.find(
    (meter: UsageMeter) => meter.slug === usageMeterSlug
  );

  if (!usageMeter) return null;

  return {
    id: String(usageMeter.id),
    slug: String(usageMeter.slug),
  };
}

/**
 * Finds a usage price by its associated usage meter slug from the pricing model.
 *
 * @param usageMeterSlug - The slug of the usage meter to find the price for
 * @param pricingModel - The billing pricing model
 * @returns The usage price object, or null if not found
 */
export function findUsagePriceByMeterSlug(
  usageMeterSlug: string,
  pricingModel: PricingModel | undefined | null
): Price | null {
  if (!pricingModel?.products || !pricingModel?.usageMeters) return null;

  // Build lookup map: slug -> id
  const meterIdBySlug = new Map(
    pricingModel.usageMeters.map((meter: UsageMeter) => [meter.slug, meter.id])
  );

  const usageMeterId = meterIdBySlug.get(usageMeterSlug);
  if (!usageMeterId) return null;

  // Find price by meter ID
  const usagePrice = pricingModel.products
    .flatMap((product: Product) => product.prices ?? [])
    .find(
      (price: Price) => price.type === 'usage' && price.usageMeterId === usageMeterId
    );

  return usagePrice ?? null;
}

/**
 * Checks if a plan is a default plan by looking up the price by slug.
 *
 * @param pricingModel - The billing pricing model
 * @param priceSlug - The slug of the price to check
 * @returns true if the plan is a default plan, false otherwise
 */
export function isDefaultPlanBySlug(
  pricingModel: PricingModel | undefined | null,
  priceSlug: string | undefined
): boolean {
  if (!pricingModel?.products || !priceSlug) return false;

  for (const product of pricingModel.products) {
    const price = product.prices?.find((p: Price) => p.slug === priceSlug);
    if (price) {
      return product.default === true;
    }
  }
  return false;
}


