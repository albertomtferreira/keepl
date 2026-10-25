# Keepl

Keepl is a private, person-centred relationship and memory manager. It is built
as an installable PWA with Next.js App Router, TypeScript, Tailwind CSS,
shadcn/ui, Firebase, React Hook Form, Zod, date-fns, and Lucide icons.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the Firebase values for your project. Authentication and data flows
require a configured Firebase project, Google sign-in, and deployed Firestore rules
and indexes. Deploy indexes and wait until they are READY before running new query shapes, including local development against a real Firebase project. Do not use production user data for automated tests.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

```bash
npm run dev           # Start the local Next.js dev server
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript without emitting files
npm test              # Run the automated test suite
npm run build         # Create a production build
npm run build:test    # Isolated production test build with fake Firebase config
npm run test:rules    # Firestore emulator ownership/repository checks
npm run test:e2e      # Chromium + mobile WebKit journeys, accessibility and PWA checks
npm run format        # Format the project
npm run format:check  # Check formatting
```

## Environment

Only public Firebase client configuration variables are documented in
`.env.example`. Do not commit `.env.local` or any secret values.

## Verification and beta rollout

Use Node 22 and Java 21 or newer for emulator tests. After `npm ci`, run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build:test
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

The browser suite starts its own production server and Firebase Auth/Firestore emulators with synthetic data. Test builds use `.next-test` and fake `demo-keepl` configuration; never deploy these artifacts. The build-ID guard rejects stale/live builds. A normal `npm run build` uses the deployment's real public Firebase configuration and the default `.next` output. Keep `NEXT_PUBLIC_FIREBASE_EMULATORS` unset in deployed environments.

Before releasing, deploy the checked-in Firestore rules/indexes to the explicitly selected project, wait for index readiness, then run the read-only deployment gate (requires Firebase CLI login and project access):

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
npm run verify:firebase -- YOUR_PROJECT_ID https://YOUR_BETA_HOST
```

This gate checks authorized domains, Google sign-in enablement, exact deployed rules, index readiness, public routes, install assets and the service-worker policy version without printing credentials. It cannot verify Google's consent screen, actual Photos selection, an installed mobile app, or assistive technology.

The PWA caches static assets and a generic offline page. Saved records and provider media are network-only; offline editing is unsupported. The canonical manifest is `/manifest.webmanifest`; older `/manifest.json` requests redirect to it. Android/iOS installation and real provider verification remain release gates until dated device/provider evidence is recorded in the [roadmap](docs/deferred-capabilities-plan.md). See the [assurance guide](docs/automated-assurance.md) for query budgets, commands and evidence scope.

## Project Status and Roadmap

The core MVP is implemented, along with text search, four-language infrastructure,
relationship graphs, export/import, and Google Photos integration. H1-H5 hardening is implemented with local evidence. H6 adds release checks and PWA/accessibility fixes; the broader-release gate remains open for hosted rollout, real Photos consent/media, physical devices and assistive-technology evidence.

The [Keepl roadmap](docs/deferred-capabilities-plan.md) is the main source of truth
for current status, staged work, dependencies, and release gates. It distinguishes
implemented features from verified behavior and includes the remaining product
roadmap after hardening.

The [original implementation plan](docs/implementation-plan.md) is retained as
historical MVP documentation.

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Firebase
- React Hook Form and Zod
- date-fns
- Lucide icons
- `@ducanh2912/next-pwa`
