import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { flowglad, getSessionFromRequest } from '../../lib/flowglad'
import { findUsagePriceByMeterSlug } from '../../lib/billing-helpers'

/**
 * POST /api/usage-events
 * Creates a usage event for the current customer
 *
 * Body: {
 *   usageMeterSlug: string;  // e.g., 'fast_generations'
 *   amount: number;          // e.g., 1
 *   transactionId?: string; // Optional: for idempotency
 * }
 */
const createUsageEventSchema = z.object({
  usageMeterSlug: z.string().min(1, 'usageMeterSlug is required'),
  amount: z
    .number()
    .int('amount must be an integer')
    .positive('amount must be a positive integer'),
  transactionId: z.string().optional(),
})

export const Route = createFileRoute('/api/usage-events')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const parseResult = createUsageEventSchema.safeParse(body)

          if (!parseResult.success) {
            return Response.json(
              {
                error: 'Invalid request body',
                details: parseResult.error.issues,
              },
              { status: 400 },
            )
          }

          const {
            usageMeterSlug,
            amount: amountNumber,
            transactionId,
          } = parseResult.data

          // Generate transaction ID if not provided
          const finalTransactionId =
            transactionId ||
            `usage_${Date.now()}_${Math.random().toString(36).substring(7)}`

          // Get customer ID from session
          const session = await getSessionFromRequest()
          const userId = session?.user.id

          if (!userId) {
            return Response.json({ error: 'User not found' }, { status: 401 })
          }

          // Get billing information to extract required IDs
          const flowgladServer = flowglad(userId)
          const billing = await flowgladServer.getBilling()

          if (!billing.customer) {
            return Response.json(
              { error: 'Customer not found' },
              { status: 404 },
            )
          }

          // Find the current subscription
          // By default, each customer can only have one active subscription at a time,
          // so accessing the first currentSubscriptions is sufficient.
          // Multiple subscriptions per customer can be enabled in dashboard > settings
          const currentSubscription = billing.currentSubscriptions?.[0]
          if (!currentSubscription) {
            return Response.json(
              { error: 'No active subscription found' },
              { status: 404 },
            )
          }

          const subscriptionId = currentSubscription.id

          const usagePrice = findUsagePriceByMeterSlug(
            usageMeterSlug,
            billing.pricingModel,
          )

          if (!usagePrice) {
            return Response.json(
              {
                error: `Usage price not found for meter: ${usageMeterSlug}. Please ensure a usage price product exists for this meter in your pricing model.`,
              },
              { status: 404 },
            )
          }

          const priceSlug = usagePrice.slug

          if (!priceSlug) {
            return Response.json(
              {
                error: `Usage price found but missing priceSlug for meter: ${usageMeterSlug}`,
              },
              { status: 500 },
            )
          }

          // Create usage event with all required IDs
          // Note: customerId is automatically resolved from the session by FlowgladServer
          // usageMeterId is automatically resolved from priceSlug by Flowglad
          const usageEvent = await flowgladServer.createUsageEvent({
            subscriptionId,
            priceSlug,
            amount: amountNumber,
            transactionId: finalTransactionId,
          })

          return Response.json({
            success: true,
            usageEvent,
          })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to create usage event',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
