<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Keepl Project Rules

## Multi-Language Requirements

Keepl supports English, Portuguese, French, and Spanish. All new user-facing UI must use the existing i18n structure rather than hard-coded display text.

- Supported locales are `en`, `pt`, `fr`, and `es`, defined in `src/lib/i18n/config.ts`.
- Translation messages live in:
  - `src/lib/i18n/messages/en.json`
  - `src/lib/i18n/messages/pt.json`
  - `src/lib/i18n/messages/fr.json`
  - `src/lib/i18n/messages/es.json`
- Client components should read translations with `useI18n()` from `src/lib/i18n/i18n-context.tsx`.
- Visible page headers in App Router pages should use `LocalizedPageHeader` from `src/components/layout/localized-page-header.tsx` when the header text must react to the selected client-side locale. Keep static route `metadata` simple and unchanged unless a server-side locale strategy is explicitly introduced.
- New pages, features, forms, empty states, loading states, error states, button labels, tooltips, confirmation dialogs, aria labels, and validation messages must add keys to all four locale files.
- Prefer feature namespaces such as `home`, `peoplePage`, `memoryForm`, `searchPage`, or `upcomingPage` over dumping unrelated text into `common`.
- Use `common` only for genuinely shared labels such as `Back`, `Saving`, connection-state labels, or repeated generic actions.
- User-owned data must not be translated or mutated during locale changes. Translate only UI chrome, labels, helper text, validation messages, status text, and formatting.
- Dates, times, and relative labels should use the locale-aware helpers in `src/lib/i18n/format.ts` or existing date utilities that accept a locale.
- For Zod or form validation, use a schema factory that accepts translated messages, following the pattern in the person and memory forms.
- If provider/service helpers return English status text, localize it at the UI boundary unless the service itself has been redesigned to return translation keys.
- Before finishing any UI feature, scan changed files for new hard-coded English user-facing strings and move them into the message files.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` after localization-affecting changes.

## Data Portability Requirements

Keepl supports user-controlled export and import for backup and portability. Any future feature that adds or changes portable user-owned data must keep export/import current.

- When adding a new top-level user-owned collection, add it to the versioned export schema in `src/types/export.ts`, the JSON export service in `src/services/export/export-data.ts`, and the import validation/write path in `src/services/import/import-data.ts`.
- When adding portable fields to an existing exported record type, verify serialization, import validation, duplicate detection, and owner reassignment still preserve the field correctly.
- Imported records must always receive the currently authenticated user's `ownerId`; never trust `ownerId` from an import file.
- Import must remain preview-first. Do not write imported records without an explicit user confirmation step.
- Provider tokens, local cache state, transient sync cursors, AI processing state, and other non-portable or security-sensitive fields should be excluded unless a feature-specific portability decision explicitly includes them.
- If a future feature stores references to external services, export only owner-scoped references or metadata that are useful and safe to restore. Do not export secrets or request new provider permissions during import.
- Add or update tests for schema validation, malformed imports, migration behavior, and ownership-sensitive import/export behavior whenever export/import coverage changes.
