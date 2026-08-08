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

Fill in the Firebase values when Firebase is configured. Phase 0 does not
require real secrets to run the app.

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
npm run build         # Create a production build
npm run format        # Format the project
npm run format:check  # Check formatting
```

## Environment

Only public Firebase client configuration variables are documented in
`.env.example`. Do not commit `.env.local` or any secret values.

## Project Plan

Implementation milestones are tracked in
[`docs/implementation-plan.md`](docs/implementation-plan.md). Phase 0 sets up the
repository and application foundation; Phase 1 will add Firebase configuration,
Google Sign-In, route protection, the app shell, primary routes, and PWA polish.

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
