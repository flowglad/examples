import type {
  BillingWithChecks,
  Price,
  UsageMeter,
  Product,
} from '@flowglad/shared';

/**
 * Computes the total usage credits that a user has purchased for the message_credits meter.
 *
 * This function filters for message_topup purchases the user has made, and sums these purchases (100 credits per purchase)
 * to get the user's total
 *
 * @param purchases - The user's purchases (from billing.purchases)
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns The total amount of usage credits for the specified meter, or 0 if not found
 */
export function computeMessageUsageTotal(
  purchases: BillingWithChecks['purchases'] | undefined,
  pricingModel: BillingWithChecks['pricingModel'] | undefined
): number {
  try {
    // Early returns if we don't have the necessary data
    if (!pricingModel?.usageMeters || !purchases || purchases.length == 0)
      return 0;

    const topUpPriceId = process.env.NEXT_PUBLIC_CREDIT_TOPUP_PRICE_ID!;

    // Filter to only usage credit grant features that match our slug
    let total = 0;
    for (const purchase of purchases) {
      if (purchase.priceId != topUpPriceId || purchase.status != 'paid')
        continue;

      total += purchase.quantity * 100;
    }

    return total;
  } catch {
    return 0;
  }
}

/**
 * Finds a usage price by its associated usage meter slug from the pricing model.
 *
 * @param usageMeterSlug - The slug of the usage meter to find the price for
 * @param pricingModel - The billing pricing model (from billing.pricingModel)
 * @returns The usage price object, or null if not found
 */
export function findUsagePriceByMeterSlug(
  usageMeterSlug: string,
  pricingModel: BillingWithChecks['pricingModel'] | undefined
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
      (price: Price) =>
        price.type === 'usage' && price.usageMeterId === usageMeterId
    );

  return usagePrice ?? null;
}
