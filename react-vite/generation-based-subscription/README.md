# Flowglad React + Vite Example

An example of how to integrate Flowglad into a React + Vite project with Clerk authentication.
This project demonstrates the "Generation-Based Subscription Template Pricing Model".

## Tech Stack

- **Frontend**: React 19 + Vite
- **Authentication**: Clerk
- **Billing**: Flowglad (`@flowglad/react` + `@flowglad/server`)
- **Backend**: Express.js (API routes for Flowglad)
- **Styling**: Tailwind CSS

## Features

- ✅ **Authentication** - Email/password and social authentication with Clerk
- ✅ **Billing** - Subscription management with Flowglad
- ✅ **Usage Tracking** - Track usage credits for AI generations
- ✅ **Pricing Page** - Display subscription plans dynamically from Flowglad
- ✅ **Dashboard** - Show usage meters and generation actions
- ✅ **Credit Top-Ups** - Purchase additional credits as needed
- ✅ **Subscription Management** - Cancel/manage subscriptions

## Prerequisites

- Node.js 18+ or Bun
- A [Flowglad account](https://app.flowglad.com/sign-up)
- A [Clerk account](https://clerk.com)

## Getting Started

### 1. Set Up Your Pricing Model

To use this example project, you'll need to upload the `pricing.yaml` file to your Flowglad dashboard and set it as your default pricing model:

1. Log in to your [Flowglad dashboard](https://flowglad.com)
2. Navigate to the Pricing Models section [Flowglad pricing models page](https://app.flowglad.com/store/pricing-models)
3. Click on Create Pricing Model
4. Import the `pricing.yaml` file from the root of this project
5. Once uploaded, set it as your default pricing model in the dashboard settings

This will enable all the subscription plans, usage meters, and features defined in the pricing configuration for your application.

### 2. Install Dependencies

Navigate into this project directory and install dependencies:

```bash
cd generation-based-subscription
bun install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of this project:

```bash
# Flowglad API Key
# Get your secret key from: https://flowglad.com
FLOWGLAD_SECRET_KEY=sk_test_...

# Clerk Authentication
# Get your keys from: https://clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Server Configuration
SERVER_PORT=3001
VITE_APP_URL=http://localhost:5173
```

**Environment Variables Explained:**

- **`FLOWGLAD_SECRET_KEY`** - Your Flowglad secret API key
  - Get your secret key from: [https://flowglad.com](https://flowglad.com)

- **`VITE_CLERK_PUBLISHABLE_KEY`** - Your Clerk publishable key (for frontend)
  - Get your keys from: [https://clerk.com](https://clerk.com)
  - Create a new application in Clerk and copy the publishable key

- **`CLERK_PUBLISHABLE_KEY`** - Your Clerk publishable key (for backend)
  - Same value as `VITE_CLERK_PUBLISHABLE_KEY` but without the `VITE_` prefix
  - Required by `@clerk/express` middleware

- **`CLERK_SECRET_KEY`** - Your Clerk secret key (backend)
  - Get this from your Clerk dashboard
  - Used by the Express backend to verify session tokens

### 4. Configure Clerk

In your Clerk dashboard:

1. Create a new application or use an existing one
2. Enable Email/Password authentication (and any social providers you want)
3. Copy the Publishable Key to your `.env` file

### 5. Start Development Server

The project uses `concurrently` to run both the Vite frontend and Express backend:

```bash
bun dev
```

This starts:
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)

Vite automatically proxies `/api/*` requests to the Express backend.

## Available Scripts

- `bun run dev` - Start both frontend and backend in development mode
- `bun run dev:client` - Start only the Vite frontend
- `bun run dev:server` - Start only the Express backend
- `bun run build` - Build the frontend for production
- `bun run preview` - Preview the production build
- `bun run lint` - Run ESLint

## Project Structure

```
├── server/
│   └── index.js           # Express backend with Flowglad routes
├── src/
│   ├── components/
│   │   ├── ui/            # UI components (Button, Card, etc.)
│   │   ├── navbar.jsx     # Navigation with account dropdown
│   │   ├── pricing-card.jsx
│   │   ├── pricing-cards-grid.jsx
│   │   ├── dashboard-skeleton.jsx
│   │   └── providers.jsx  # Flowglad provider wrapper
│   ├── hooks/
│   │   └── use-mobile.js  # Mobile breakpoint hook
│   ├── lib/
│   │   ├── billing-helpers.js  # Billing utility functions
│   │   └── utils.js       # General utilities (cn)
│   ├── pages/
│   │   ├── home.jsx       # Dashboard with usage tracking
│   │   ├── pricing.jsx    # Pricing plans page
│   │   ├── sign-in.jsx    # Clerk sign-in page
│   │   └── sign-up.jsx    # Clerk sign-up page
│   ├── App.jsx            # Main app with routing
│   ├── main.jsx           # Entry point with Clerk provider
│   └── index.css          # Tailwind CSS styles
├── pricing.yaml           # Flowglad pricing model configuration
├── vite.config.js         # Vite config with API proxy
└── tailwind.config.js     # Tailwind CSS config
```

## Architecture

### Frontend (React + Vite)

The frontend uses `@flowglad/react` for billing integration:

- **FlowgladProvider**: Wraps the app and provides billing context
- **useBilling hook**: Access billing data, create checkouts, manage subscriptions

```jsx
import { useBilling } from '@flowglad/react';

function MyComponent() {
  const { 
    checkFeatureAccess, 
    checkUsageBalance,
    createCheckoutSession,
    currentSubscriptions,
  } = useBilling();
  
  // Check if user has access to a feature
  if (checkFeatureAccess('premium_feature')) {
    // Show premium content
  }
}
```

### Backend (Express)

The Express backend handles Flowglad API calls with `@flowglad/server`:

- `GET /api/flowglad/billing` - Get customer billing data
- `POST /api/flowglad/checkout-sessions` - Create checkout sessions
- `POST /api/flowglad/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/usage-events` - Create usage events

User authentication is handled via Clerk session tokens passed as cookies. The Express backend verifies these tokens using `@clerk/express` middleware.

## Authentication Flow

1. User signs in/up via Clerk components
2. Clerk creates a session and stores the token in cookies (`__session`)
3. Frontend makes API requests to Express backend (cookies automatically included)
4. Express backend uses `@clerk/express` middleware to verify and authenticate the request
5. Express backend extracts user ID from Clerk auth and creates FlowgladServer with user ID as customerExternalId
6. Flowglad manages customer billing data linked to Clerk user ID

## Billing Flow

1. New user signs in → redirected to pricing page
2. User selects a plan → checkout session created → redirected to Flowglad checkout
3. After payment → subscription activated → redirected to dashboard
4. Dashboard shows usage meters and generation buttons
5. Each generation consumes credits via usage events
6. User can purchase top-ups or manage subscription from navbar

## Customization

### Adding New Features

1. Add feature definitions to `pricing.yaml`
2. Use `checkFeatureAccess('feature_slug')` to gate features

### Adding New Usage Meters

1. Add usage meter to `pricing.yaml`
2. Add usage price product
3. Use `checkUsageBalance('meter_slug')` to check balance
4. Call `/api/usage-events` to record usage

## Troubleshooting

### "User not authenticated" error

Make sure:
- Clerk is properly configured with all three keys:
  - `VITE_CLERK_PUBLISHABLE_KEY` (frontend)
  - `CLERK_PUBLISHABLE_KEY` (backend)
  - `CLERK_SECRET_KEY` (backend)
- User is signed in before accessing billing features
- Session cookies are being sent with requests (check browser developer tools → Network → Cookies)
- CORS is configured correctly with `credentials: true`
- `@clerk/express` middleware is properly initialized

### Billing data not loading

Check:
- FLOWGLAD_SECRET_KEY is set correctly
- Express server is running (check terminal for logs)
- Vite proxy is configured correctly

### Pricing plans not showing

Ensure:
- pricing.yaml is uploaded to Flowglad dashboard
- Pricing model is set as default
- Products have active subscription prices

## Learn More

- [Flowglad Documentation](https://docs.flowglad.com)
- [Flowglad React SDK](https://docs.flowglad.com/sdks/react)
- [Clerk Documentation](https://clerk.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
