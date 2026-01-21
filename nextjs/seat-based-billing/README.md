# Flowglad Seat-Based Billing Example

A Linear-style issue tracker demo showcasing seat-based billing with Flowglad. This example demonstrates how to implement per-user pricing with multiple tiers, monthly/yearly billing toggle, and team seat management.

## Tech Stack

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[BetterAuth](https://www.better-auth.com)** - Authentication with organization support
- **[Flowglad](https://flowglad.com)** - Billing and subscription management
- **[Drizzle ORM](https://orm.drizzle.team)** - PostgreSQL database with type-safe queries
- **[TypeScript](https://www.typescriptlang.org)** - Type safety throughout
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - Beautiful UI component library

## Features

- **Linear-Style Dashboard** - Issue tracker UI with status indicators and priority badges
- **4-Tier Pricing** - Free, Basic ($10/user), Business ($16/user), Enterprise (custom)
- **Monthly/Yearly Toggle** - Switch between billing periods with savings display
- **Seat Management** - Add/remove team members, adjust seat count
- **Resource-Based Billing** - Seats and teams tracked as Flowglad resources
- **Dual Billing Mode** - Supports both user-based and organization-based billing
- **Authentication** - Email/password with BetterAuth

## Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 2 teams, 250 issues, Slack/GitHub, AI agents |
| **Basic** | $10/user/mo | 5 teams, unlimited issues, admin roles |
| **Business** | $16/user/mo | Unlimited teams, Product Intelligence, Linear Insights |
| **Enterprise** | Custom | SAML SSO, SCIM, advanced security, dedicated support |

## How It Works

1. **Sign Up** - Create an account with email/password
2. **Choose a Plan** - Select from Free, Basic, Business, or Enterprise
3. **Select Seats** - Choose how many users for paid plans
4. **Manage Team** - Add team members by email (claims seats)
5. **Adjust as Needed** - Scale seats up/down with prorated billing

## Prerequisites

- Node.js >= 18.18.0
- Bun >= 1.3.1
- PostgreSQL database (or use Docker)

## Getting Started

### 1. Set Up Your Pricing Model

Upload the `pricing.yaml` file to your Flowglad dashboard:

1. Log in to your [Flowglad dashboard](https://flowglad.com)
2. Navigate to [Pricing Models](https://app.flowglad.com/pricing-models)
3. Click "Create Pricing Model"
4. Import the `pricing.yaml` file from this project
5. Set it as your default pricing model

### 2. Install Dependencies

```bash
bun install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required values:

- **`DATABASE_URL`** - PostgreSQL connection string
- **`BETTER_AUTH_SECRET`** - Generate with: `openssl rand -base64 32`
- **`FLOWGLAD_SECRET_KEY`** - Get from [flowglad.com](https://flowglad.com)

### 4. Set Up Database

Using Docker (recommended):
```bash
bun db:setup
```

Or manually run migrations:
```bash
bun db:generate
bun db:migrate
```

### 5. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint
- `bun lint:fix` - Fix ESLint errors automatically
- `bun type-check` - Run TypeScript type checking
- `bun db:setup` - Start PostgreSQL with Docker and run migrations
- `bun db:teardown` - Stop and remove Docker containers
- `bun db:generate` - Generate database migrations
- `bun db:migrate` - Run database migrations
- `bun db:studio` - Open Drizzle Studio (database GUI)

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # BetterAuth routes
│   │   ├── flowglad/     # Flowglad billing routes
│   │   └── health/       # Health check endpoint
│   ├── create-org/       # Organization creation page
│   ├── pricing/          # Pricing page with tier selection
│   ├── sign-in/          # Sign in page
│   └── sign-up/          # Sign up page
├── components/
│   ├── ui/               # shadcn/ui components
│   └── navbar.tsx        # Navigation component
├── lib/
│   ├── auth.ts           # BetterAuth server config
│   ├── auth-client.ts    # BetterAuth client config
│   ├── billing-helpers.ts # Pricing tier helpers
│   └── flowglad.ts       # Flowglad server config
└── server/db/
    ├── client.ts         # Drizzle client
    └── schema.ts         # Database schema
```

## Billing Architecture

### Resources
- **Seats** - Per-user allocation for paid plans
- **Teams** - Team limits (2 for Free, 5 for Basic, unlimited for Business+)

### Dual Billing Mode
This example supports both user-based and organization-based billing:

- **User-based (default)** - Individual users have their own subscriptions
- **Organization-based** - Create an organization to share billing across team members

The billing customer ID is determined by:
1. If user has an active organization → organization ID
2. Otherwise → user ID

## Key Implementation Details

### Pricing Page (`src/app/pricing/pricing-client.tsx`)
- Groups products by tier (Basic, Business, Enterprise)
- Monthly/yearly toggle with savings calculation
- Quantity selector for seat count
- Free plan displayed separately

### Home Dashboard (`src/app/home-client.tsx`)
- Linear-style issue list with status/priority indicators
- Team seat usage visualization
- Add/remove team members
- Adjust seat count

### Billing Helpers (`src/lib/billing-helpers.ts`)
- `groupProductsByTier()` - Groups monthly/yearly variants
- `getFreePlan()` - Extracts free tier details
- `transformProductsToPricingPlans()` - Converts products to display format
