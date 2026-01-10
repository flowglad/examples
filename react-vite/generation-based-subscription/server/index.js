const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { FlowgladServer } = require('@flowglad/server');
const { requestHandler } = require('@flowglad/server');
const { clerkMiddleware, getAuth } = require('@clerk/express');

// Load environment variables
dotenv.config();

// Check if FLOWGLAD_SECRET_KEY is set
if (!process.env.FLOWGLAD_SECRET_KEY) {
  console.error('ERROR: FLOWGLAD_SECRET_KEY is not set in .env file');
  process.exit(1);
}

// Check if CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  console.error('ERROR: CLERK_PUBLISHABLE_KEY is not set in .env file');
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('ERROR: CLERK_SECRET_KEY is not set in .env file');
  process.exit(1);
}

console.log('FLOWGLAD_SECRET_KEY loaded');
console.log('CLERK_PUBLISHABLE_KEY loaded');
console.log('CLERK_SECRET_KEY loaded');

// Cache for user details (in production, use a real database)
const userCache = new Map();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Apply Clerk middleware to authenticate all requests
app.use(clerkMiddleware());

// Middleware to extract user info from Clerk auth
const extractUserFromClerk = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      console.warn('No authenticated user');
      req.user = null;
      return next();
    }

    // For this example, we'll just use the auth info directly
    // In production, you might want to fetch full user details
    req.user = {
      id: auth.userId,
      // We don't have email/name from getAuth, but we can cache them from Clerk
      // or fetch them if needed. For now, we'll use the userId as the external ID.
    };
    
    console.log('User authenticated via Clerk:', req.user.id);
    next();
  } catch (error) {
    console.error('Error extracting user from Clerk:', error.message);
    req.user = null;
    next();
  }
};

app.use(extractUserFromClerk);

/**
 * Factory that creates a FlowgladServer for a specific customer
 * customerExternalId is the Clerk user ID
 */
const flowglad = (customerExternalId) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async (externalId) => {
      // Get user details from cache (if available)
      const cachedUser = userCache.get(externalId);
      if (cachedUser) {
        return cachedUser;
      }
      
      // Fallback - in production, fetch from your database
      return {
        email: `user_${externalId}@example.com`,
        name: 'User',
      };
    },
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    authenticated: !!req.user,
    userId: req.user?.id || null,
  });
});

// Handle all Flowglad API requests using requestHandler
// This approach gives us more control and handles the path rewriting correctly
app.use('/api/flowglad', async (req, res, next) => {
  try {
    // Log incoming request
    const fullUrl = req.originalUrl || req.url;
    console.log(`Flowglad request: ${req.method} ${fullUrl}`);
    
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'Unauthorized', json: {} },
        data: {}
      });
    }

    // Cache user details
    userCache.set(req.user.id, {
      email: req.user.email || `user_${req.user.id}@example.com`,
      name: req.user.name || 'User',
    });

    // Parse the path from the request
    // req.path is relative to the mount point (/api/flowglad)
    let path = req.path
      .split('/')
      .filter((segment) => segment !== '' && segment !== 'api' && segment !== 'flowglad');

    console.log(`Processing path: [${path.join(', ')}], Method: ${req.method}`);

    // Create the request handler
    const flowgladHandler = requestHandler({
      flowglad: (customerExternalId) => flowglad(customerExternalId),
      getCustomerExternalId: async () => {
        if (!req.user) {
          throw new Error('User not authenticated');
        }
        return req.user.id;
      },
    });

    // Parse request body for POST/PUT/PATCH requests
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = req.body || {};
      } catch (e) {
        body = {};
      }
    }

    // Parse query parameters for GET requests
    const query = req.method === 'GET' 
      ? req.query
      : undefined;

    // Call the handler
    console.log(`Calling requestHandler with path: [${path.join(', ')}]`);
    const result = await flowgladHandler(
      {
        path,
        method: req.method,
        query,
        body,
      },
      req
    );

    console.log(`   Handler result - Status: ${result.status}, Has error: ${!!result.error}, Has data: ${!!result.data}`);
    
    // Return the response - match TanStack Start format exactly
    // Always include both error and data properties
    const response = {
      error: result.error ?? null,
      data: result.data ?? null,
    };
    
    console.log(`   Sending response with status ${result.status}`);
    res.status(result.status).json(response);
  } catch (error) {
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: {
        code: error instanceof Error ? error.message : 'Internal Server Error',
        json: {}
      },
      data: {}
    });
  }
});

/**
 * POST /api/usage-events
 * Create a usage event for the current customer
 */
app.post('/api/usage-events', async (req, res) => {
  try {
    if (!req.user) {
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

    // Cache user details
    userCache.set(req.user.id, {
      email: req.user.email || `user_${req.user.id}@example.com`,
      name: req.user.name || 'User',
    });

    const flowgladServer = flowglad(req.user.id);
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

function findUsagePriceByMeterSlug(usageMeterSlug, pricingModel) {
  if (!pricingModel?.products || !pricingModel?.usageMeters) return null;

  const meterIdBySlug = new Map(
    pricingModel.usageMeters.map(meter => [meter.slug, meter.id])
  );

  const usageMeterId = meterIdBySlug.get(usageMeterSlug);
  if (!usageMeterId) return null;

  const usagePrice = pricingModel.products
    .flatMap(product => product.prices ?? [])
    .find(price => price.type === 'usage' && price.usageMeterId === usageMeterId);

  return usagePrice ?? null;
}

app.listen(PORT, () => {
  console.log(`Flowglad server running on http://localhost:${PORT}`);
});
