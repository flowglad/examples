import type {
  BillingWithChecks,
  Price,
  UsageMeter,
  Product,
} from '@flowglad/shared';

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
