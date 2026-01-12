# Flowglad React + Vite Example

An example of how to integrate Flowglad into a React + Vite project with Better Auth authentication.
This project demonstrates the "Generation-Based Subscription Template Pricing Model".

## Tech Stack

- **Frontend**: React 19 + Vite
- **Authentication**: Better Auth
- **Database**: PostgreSQL with Drizzle ORM
- **Billing**: Flowglad (`@flowglad/react` + `@flowglad/server`)
- **Backend**: Express.js (API routes for Flowglad)
- **Styling**: Tailwind CSS

## Features

- ✅ **Authentication** - Email/password authentication with Better Auth
- ✅ **Billing** - Subscription management with Flowglad
- ✅ **Usage Tracking** - Track usage credits for AI generations
- ✅ **Pricing Page** - Display subscription plans dynamically from Flowglad
- ✅ **Dashboard** - Show usage meters and generation actions
- ✅ **Credit Top-Ups** - Purchase additional credits as needed
- ✅ **Subscription Management** - Cancel/manage subscriptions

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (local or hosted)
- A [Flowglad account](https://app.flowglad.com/sign-up)

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

Copy the example environment file
```bash
cp .env.example .env.local
```

Fill in the required values in `.env.local`:

- **`DATABASE_URL`** - PostgreSQL connection string
  - Example: `postgresql://user:password@localhost:5432/dbname`
  
- **`BETTER_AUTH_SECRET`** - Secret key for BetterAuth session encryption
  - Generate with: `openssl rand -base64 32`
  
- **`FLOWGLAD_SECRET_KEY`** - Secret key for Flowglad API calls
  - Get your secret key from: [https://flowglad.com](https://flowglad.com)

### Server Configuration
```
SERVER_PORT=3001
VITE_APP_URL=http://localhost:5173
```

### 4. Set up Database

Generate and run the database migrations

```bash
# Generate migration files
bun run db:generate

# Run migrations to create tables
bun run db:migrate

# (Optional) Open Drizzle Studio to inspect your database
bun run db:studio
```

This will create the following tables:
- `users` - User accounts
- `sessions` - User sessions
- `accounts` - Authentication accounts (email/password)
- `verifications` - Email verification tokens

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
- `bun run db:generate` - Generate Drizzle migration files
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio to inspect database

## Project Structure

```
├── server/
│   ├── db/
│   │   ├── schema.js      # Drizzle schema (Better Auth tables)
│   │   └── client.js      # Database client
│   ├── lib/
│   │   └── auth.js        # Better Auth configuration
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
│   │   ├── auth-client.js # Better Auth React client
│   │   ├── billing-helpers.js  # Billing utility functions
│   │   └── utils.js       # General utilities (cn)
│   ├── pages/
│   │   ├── home.jsx       # Dashboard with usage tracking
│   │   ├── pricing.jsx    # Pricing plans page
│   │   ├── sign-in.jsx    # Better Auth sign-in page
│   │   └── sign-up.jsx    # Better Auth sign-up page
│   ├── App.jsx            # Main app with routing
│   ├── main.jsx           # Entry point
│   └── index.css          # Tailwind CSS styles
├── drizzle/               # Generated migration files
├── drizzle.config.js      # Drizzle configuration
├── pricing.yaml           # Flowglad pricing model configuration
├── vite.config.js         # Vite config with API proxy
└── tailwind.config.js     # Tailwind CSS config
```

## Architecture

### Frontend (React + Vite)

The frontend uses `@flowglad/react` for billing integration and `better-auth/react` for authentication:

- **FlowgladProvider**: Wraps the app and provides billing context
- **useBilling hook**: Access billing data, create checkouts, manage subscriptions
- **authClient**: Better Auth React client for authentication

```jsx
import { useBilling } from '@flowglad/react';
import { authClient } from './lib/auth-client';

function MyComponent() {
  const { 
    checkFeatureAccess, 
    checkUsageBalance,
    createCheckoutSession,
    currentSubscriptions,
  } = useBilling();
  
  const { data: session } = authClient.useSession();
  
  // Check if user has access to a feature
  if (checkFeatureAccess('premium_feature')) {
    // Show premium content
  }
}
```

### Backend (Express)

The Express backend handles Flowglad API calls with `@flowglad/server` and authentication with Better Auth:

- `GET /api/auth/session` - Get current user session
- `ALL /api/auth/*` - Better Auth API routes (sign in, sign up, etc.)
- `GET /api/flowglad/billing` - Get customer billing data
- `POST /api/flowglad/checkout-sessions` - Create checkout sessions
- `POST /api/flowglad/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/usage-events` - Create usage events

User authentication is handled via Better Auth session cookies. The Express backend verifies sessions using Better Auth's session validation.

## Authentication Flow

1. User signs in/up via Better Auth forms
2. Better Auth creates a session and stores it in the database
3. Session token is stored in HTTP-only cookies
4. Frontend makes API requests to Express backend (cookies automatically included)
5. Express backend uses Better Auth to verify the session from cookies
6. Express backend extracts user ID from session and creates FlowgladServer with user ID as customerExternalId
7. Flowglad manages customer billing data linked to Better Auth user ID

## Auth Architecture

- **Auth Configuration**: `server/lib/auth.js` - Better Auth instance with Drizzle adapter
- **Auth Client**: `src/lib/auth-client.js` - React client for Better Auth
- **Session Validation**: Express middleware in `server/index.js` validates sessions on protected routes
- **Protected Routes**: React Router `ProtectedRoute` component checks session before rendering
- **Database**: Better Auth tables managed by Drizzle ORM in `server/db/schema.js`

## Billing Flow

1. New user signs up → redirected to pricing page
2. User selects a plan → checkout session created → redirected to Flowglad checkout
3. After payment → subscription activated → redirected to dashboard
4. Dashboard shows usage meters and generation buttons
5. Each generation consumes credits via usage events
6. User can purchase top-ups or manage subscription from navbar

## Creating a Test User

1. Start the development server: `bun dev`
2. Navigate to [http://localhost:5173/sign-up](http://localhost:5173/sign-up)
3. Fill in the sign-up form with:
   - Email: `test@example.com`
   - Password: (at least 8 characters)
   - Name: (optional)
4. Click "Sign Up"
5. You'll be automatically signed in and redirected to the dashboard

## Billing

Flowglad is integrated for subscription and billing management. The Flowglad provider is configured to work with BetterAuth sessions. The pricing model is defined in `pricing.yaml` at the root of the project, which includes subscription plans, usage meters, and features.

## Database

The project uses Drizzle ORM with PostgreSQL. The schema includes the necessary tables for BetterAuth (users, sessions, accounts, verifications). You can extend the schema in `server/db/schema.ts`.
