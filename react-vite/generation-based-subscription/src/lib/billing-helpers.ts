/**
 * Computes the total usage credits for a given usage meter slug from the current subscription's feature items.
 *
 * @param {string} usageMeterSlug - The slug of the usage meter to compute totals for
 * @param {object} currentSubscription - The current subscription object
 * @param {object} pricingModel - The billing pricing model
 * @returns {number} The total amount of usage credits for the specified meter, or 0 if not found
 */
export function computeUsageTotal(usageMeterSlug, currentSubscription, pricingModel) {
  try {
    if (!currentSubscription || !pricingModel?.usageMeters) return 0;

    const experimental = currentSubscription.experimental;
    const featureItems = experimental?.featureItems ?? [];

    if (featureItems.length === 0) return 0;

    // Build a lookup map: usageMeterId -> slug
    const usageMeterById = {};
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
        total += item.amount;
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
 * @param {string} usageMeterSlug - The slug of the usage meter to find
 * @param {object} pricingModel - The billing pricing model
 * @returns {{ id: string, slug: string } | null} The usage meter object or null
 */
export function findUsageMeterBySlug(usageMeterSlug, pricingModel) {
  if (!pricingModel?.usageMeters) return null;

  const usageMeter = pricingModel.usageMeters.find(
    (meter) => meter.slug === usageMeterSlug
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
 * @param {string} usageMeterSlug - The slug of the usage meter to find the price for
 * @param {object} pricingModel - The billing pricing model
 * @returns {object | null} The usage price object, or null if not found
 */
export function findUsagePriceByMeterSlug(usageMeterSlug, pricingModel) {
  if (!pricingModel?.products || !pricingModel?.usageMeters) return null;

  // Build lookup map: slug -> id
  const meterIdBySlug = new Map(
    pricingModel.usageMeters.map((meter) => [meter.slug, meter.id])
  );

  const usageMeterId = meterIdBySlug.get(usageMeterSlug);
  if (!usageMeterId) return null;

  // Find price by meter ID
  const usagePrice = pricingModel.products
    .flatMap((product) => product.prices ?? [])
    .find(
      (price) => price.type === 'usage' && price.usageMeterId === usageMeterId
    );

  return usagePrice ?? null;
}

/**
 * Checks if a plan is a default plan by looking up the price by slug.
 *
 * @param {object} pricingModel - The billing pricing model
 * @param {string} priceSlug - The slug of the price to check
 * @returns {boolean} true if the plan is a default plan
 */
export function isDefaultPlanBySlug(pricingModel, priceSlug) {
  if (!pricingModel?.products || !priceSlug) return false;

  for (const product of pricingModel.products) {
    const price = product.prices?.find((p) => p.slug === priceSlug);
    if (price) {
      return product.default === true;
    }
  }
  return false;
}


