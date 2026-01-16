import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { FlowgladServer, requestHandler } from '@flowglad/server';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { db } from './db/client.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Load environment variables
// Prefer .env.local for local development (consistent with other examples)
dotenv.config({ path: '.env.local' });

// Check if FLOWGLAD_SECRET_KEY is set
if (!process.env.FLOWGLAD_SECRET_KEY) {
  console.error('ERROR: FLOWGLAD_SECRET_KEY is not set in .env.local file');
  process.exit(1);
}

// Check if BETTER_AUTH_SECRET is set
if (!process.env.BETTER_AUTH_SECRET) {
  console.error('ERROR: BETTER_AUTH_SECRET is not set in .env.local file');
  process.exit(1);
}

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Configure CORS middleware
app.use(
  cors({
    origin: process.env.VITE_APP_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Better Auth API routes - must be BEFORE express.json()
// Use toNodeHandler for proper Express integration
app.all('/api/auth/*', toNodeHandler(auth));

// Mount express.json() middleware AFTER Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

// Test route to verify server is working
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
      } | null;
    }
  }
}

// Middleware to extract user info from Better Auth session
const extractUserFromSession = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Skip auth extraction for auth routes
    if (req.path.startsWith('/api/auth')) {
      return next();
    }

    // Use fromNodeHeaders to convert Express headers to Better Auth format
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    
    if (!session?.user) {
      req.user = null;
      return next();
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    
    next();
  } catch (error) {
    console.error('Error extracting user from session:', error instanceof Error ? error.message : String(error));
    req.user = null;
    next();
  }
};

app.use(extractUserFromSession);

/**
 * Factory that creates a FlowgladServer for a specific customer
 * customerExternalId is the Better Auth user ID
 */
const flowglad = (customerExternalId: string) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async (externalId) => {
      try {
        const [user] = await db
          .select({
            email: users.email,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, externalId))
          .limit(1);
        
        if (user && user.email) {
          return {
            email: user.email,
            name: user.name || '',
          };
        }
        
        // Fallback if user not found in database
        return {
          email: `user_${externalId}@example.com`,
          name: 'User',
        };
      } catch (error) {
        console.error('[Flowglad] Error fetching user from database:', error);
        // Fallback on error
        return {
          email: `user_${externalId}@example.com`,
          name: 'User',
        };
      }
    },
  });
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    authenticated: !!req.user,
    userId: req.user?.id || null,
  });
});

// Create Flowglad request handler
const flowgladHandler = requestHandler({
  flowglad: (customerExternalId) => flowglad(customerExternalId),
  getCustomerExternalId: async (req: Request) => {
    // Get session from Better Auth and extract user ID
    // Use fromNodeHeaders to convert Express headers to Better Auth format
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('Unable to determine customer external ID');
      }

      return userId;
    } catch (error) {
      console.error('[Flowglad] Error getting external ID:', error);
      throw error;
    }
  },
});

// Handle all Flowglad API requests
// This catch-all route handles all paths under /api/flowglad
app.all('/api/flowglad/*', async (req: Request, res: Response) => {
  try {
    // Extract the path after /api/flowglad/
    const url = new URL(req.originalUrl, `http://${req.headers.host}`);
    const path = url.pathname
      .replace('/api/flowglad/', '')
      .split('/')
      .filter((segment) => segment !== '');

    // Call the Flowglad handler
    // Convert Express query params to simple string record
    const queryParams: Record<string, string> | undefined = req.method === 'GET' && req.query
      ? Object.fromEntries(
          Object.entries(req.query).map(([key, value]): [string, string] => {
            let stringValue: string;
            if (typeof value === 'string') {
              stringValue = value;
            } else if (Array.isArray(value)) {
              stringValue = (value[0] as string) ?? '';
            } else if (value !== undefined && value !== null) {
              stringValue = String(value);
            } else {
              stringValue = '';
            }
            return [key, stringValue];
          })
        ) as Record<string, string>
      : undefined;

    const result = await flowgladHandler(
      {
        path,
        method: req.method as any, // requestHandler accepts standard HTTP methods
        query: queryParams,
        body: req.method !== 'GET' ? req.body : undefined,
      },
      req
    );

    // Send the response
    res.status(result.status).json({
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    console.error('[Flowglad Router] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/usage-events
 * Create a usage event for the current customer
 */
app.post('/api/usage-events', async (req: Request, res: Response) => {
  try {
    // Get session from Better Auth and extract user ID
    // Use fromNodeHeaders to convert Express headers to Better Auth format
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    
    const externalId = session?.user?.id;

    if (!externalId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { usageMeterSlug, amount, transactionId } = req.body;

    if (!usageMeterSlug) {
      return res.status(400).json({ error: 'usageMeterSlug is required' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const finalTransactionId = transactionId || 
      `usage_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const flowgladServer = flowglad(externalId);
    const billing = await flowgladServer.getBilling();

    if (!billing.customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const currentSubscription = billing.currentSubscriptions?.[0];
    if (!currentSubscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const usagePrice = findUsagePriceByMeterSlug(usageMeterSlug, billing.pricingModel);
    if (!usagePrice) {
      return res.status(404).json({ 
        error: `Usage price not found for meter: ${usageMeterSlug}` 
      });
    }

    const priceSlug = usagePrice.slug;
    if (!priceSlug) {
      return res.status(500).json({ 
        error: `Usage price found but missing priceSlug for meter: ${usageMeterSlug}` 
      });
    }

    const usageEvent = await flowgladServer.createUsageEvent({
      subscriptionId: currentSubscription.id,
      priceSlug,
      amount,
      transactionId: finalTransactionId,
    });

    res.json({ success: true, usageEvent });
  } catch (error) {
    console.error('Error creating usage event:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create usage event' 
    });
  }
});

function findUsagePriceByMeterSlug(usageMeterSlug: string, pricingModel: any) {
  if (!pricingModel?.products || !pricingModel?.usageMeters) return null;

  const meterIdBySlug = new Map(
    pricingModel.usageMeters.map((meter: any) => [meter.slug, meter.id])
  );

  const usageMeterId = meterIdBySlug.get(usageMeterSlug);
  if (!usageMeterId) return null;

  const usagePrice = pricingModel.products
    .flatMap((product: any) => product.prices ?? [])
    .find((price: any) => price.type === 'usage' && price.usageMeterId === usageMeterId);

  return usagePrice ?? null;
}

app.listen(PORT, () => {
  console.log(`Flowglad server running on http://localhost:${PORT}`);
});
