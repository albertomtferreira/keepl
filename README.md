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
and indexes. Do not use production user data for automated tests.

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
npm run format        # Format the project
npm run format:check  # Check formatting
```

## Environment

Only public Firebase client configuration variables are documented in
`.env.example`. Do not commit `.env.local` or any secret values.

## Project Status and Roadmap

The core MVP is implemented, along with text search, four-language infrastructure,
relationship graphs, export/import, and Google Photos integration. Import integrity,
credential handling, localization coverage, data lifecycle, automated assurance,
and beta verification are the next priorities.

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
