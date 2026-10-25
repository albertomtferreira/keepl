# Keepl Roadmap

This is the main source of truth for current status, priorities, release gates, and future work. The filename is retained so existing links keep working. The [original implementation plan](./implementation-plan.md) records the historical MVP milestones; it does not define the next work.

Last reviewed: 2026-10-25. The initial assessment below informed the roadmap; H1/H2/H3/H4/H5 implementation decisions and local verification evidence are recorded in their stage sections.

## Status and Evidence

Use these statuses consistently:

- **Implemented:** code exists; this does not imply deployed or end-to-end verified.
- **Hardening required:** a feature exists but has known gaps below.
- **Planned:** work has not started.
- **Verified:** acceptance criteria passed, with dated evidence recorded here.
- **Blocked:** record the dependency and what will unblock it.

The local assessment passed lint, TypeScript, 33 tests, and the production build. H3 authenticated localization checks are recorded below; H5 records local authenticated write flows and emulator ownership checks; deployed Firestore rules/indexes, provider permissions, and physical-device PWA behavior remain H6 verification gates. The initial assessment found no checked-in CI workflow, browser test suite, or Firestore emulator security suite; H5 now supplies these with local verification evidence below.

| Area                                                                                               | Current status                                                             | Remaining gate                       |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Core MVP: people, groups, relationships, notes, dates, memories, interactions, dashboard, settings | Implemented                                                                | Stages H4-H6                         |
| Text search (FT 1)                                                                                 | Implemented; local matching and ranking, without AI language understanding | Stage H6                             |
| Four-language support (FT 2)                                                                       | Verified locally for H3; release verification remains                      | Stage H6                             |
| Relationship graph (FT 12)                                                                         | Implemented                                                                | Stage H6 device/accessibility checks |
| Export/import (FT 14)                                                                              | Implemented; H1 local checks passed                                        | H6 deployed verification          |
| Google Photos (FT 9)                                                                               | Hardening required; picker, viewing, and download code exists              | Stages H2 and H6                     |
| Reminders and PWA                                                                                  | Implemented foundation; notification delivery remains planned              | Stages H6 and R3                     |
| Other feature tracks                                                                               | Planned                                                                    | Product stages below                 |

## Delivery Sequence

Complete H1-H6 before starting new provider or AI delivery work. H1 and H2 are the highest priorities. H3-H5 follow; H6 verifies the combined result. Stage R1 then addresses existing UX requests before integration expansion. Do one feature track at a time; prerequisites and acceptance evidence determine readiness, rather than a target date alone.

| Stage | Scope                                                      | Status                           | Dependency                                   |
| ----- | ---------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| H1    | Import validation, references, recovery                    | Implemented                      | Local checks below; deployed checks in H5/H6 |
| H2    | Google Photos credentials and account isolation            | Implemented                      | Before new provider integrations             |
| H3    | Complete localization                                      | Verified locally (2026-10-25)    | Before broader beta                          |
| H4    | Data lifecycle and honest failure states                   | Implemented; local checks passed | Coordinate reference policy with H1          |
| H5    | Automated checks, rules/index configuration, bounded reads | Implemented; local checks passed | Cover H1-H4 fixes                            |
| H6    | End-to-end beta and release verification                   | Verification in progress; release gate open                          | H1-H5                                        |
| R1    | Navigation, memory labels, remaining core UX               | Planned                          | H6                                           |
| R2    | Calendar and selected Contacts import, then sync           | Planned                          | H6; H1/H2 patterns                           |
| R3    | Smart reminders, then notification delivery                | Planned                          | H4/H5; reliable scheduling                   |
| R4    | AI entry, extraction, then semantic search                 | Planned                          | H1/H4/H5; privacy and cost decisions         |
| R5    | Additional providers and social integrations               | Planned                          | H2; provider feasibility review              |
| R6    | Encrypted fields, then explicit sharing                    | Planned                          | Security designs; H1/H4/H5                   |

## Hardening Stages

### H1: Import Integrity

Problem: [import validation](../src/services/import/import-data.ts) checks the envelope and record ID but accepts arbitrary fields. Writes are sequential, and selection/duplicate handling does not reconcile references.

- [x] H1.1 Define collection-specific schemas for every portable record, including required fields, enums, dates/timestamps, IDs, and references. Reject unsupported versions and malformed input before any write. Define migration behavior and test supported versions; reject others with a useful message.
- [x] H1.2 Build a dependency-aware preview that detects duplicate IDs within the file and against existing records. Treat natural-key matches as reviewable candidates rather than assuming equal names identify the same person. Show conflicts and selection consequences before confirmation.
- [x] H1.3 Define ID allocation/remapping for cross-account restores and collisions. Resolve references to selected or explicitly matched existing records; block or clearly omit unresolved dependencies. Never overwrite existing records silently.
- [x] H1.4 Choose and document the write strategy for small and large imports. Use atomic batches where possible; otherwise provide accurate progress, failure reporting, and safe retry/resume without duplicates. Do not promise rollback across separate batches.
- [x] H1.5 Test all collections through export/preview/import, malformed records, version handling, duplicate/conflict cases, selective dependencies, interrupted writes, and cross-account restore. Always assign the current user's ownerId and exclude secrets/transient state.

Exit gate: invalid imports write nothing; a valid restore preserves domain fields and references; conflict decisions are explicit; interruption and retry do not silently lose or duplicate data. Preview and confirmation remain mandatory. Record test evidence before closing FT 14 hardening.

H1 implementation decisions (2026-10-25, owner: Codex):

- Version policy: v1 is the only supported version. Every collection must be present, every record must satisfy its domain schema, and IDs must be unique within each collection. No speculative migration or defaulting of missing domain fields. Legacy v1 photo availability/check timestamps are accepted and discarded; these cache fields are excluded from new exports. Unknown record fields are rejected on import; exports use an explicit field allowlist. Owner IDs are discarded/reassigned to the authenticated user.
- Conflict policy: preview flags existing IDs and natural-key candidates, initially deselecting them. Each record can be selected explicitly as a separate new copy or skipped. Equal names never imply identity. Matching/merging into existing records is deliberately unavailable in this stage. Every referenced record must also be selected from the file; unresolved references block all writes before confirmation.
- Restore IDs: SHA-256 of the authenticated owner, normalized complete backup fingerprint, collection, and original ID. Every reference is remapped. Reusing the same normalized backup and selection reuses destination IDs across retries/reloads and across ambiguous commit responses. Another account receives different IDs. A changed backup is a separate restore; keep the original file for recovery.
- Write policy: validate the entire restore before writing. Small imports commit atomically in one Firestore transaction; larger imports use dependency-ordered transactions of at most 100 records and about 4 MB of serialized payload. Reject individual records above the conservative 900 KB limit before writing any chunk. Each transaction reads destinations before creating missing records; exact existing copies are treated as already restored, and changed destinations abort the transaction without overwriting. Earlier committed chunks remain after a later failure; there is no cross-chunk rollback. Progress counts only acknowledged chunks. Retry the same selection, including dependencies, to resume; changing already restored records can require manual conflict resolution.
- Recovery UI: disable selection changes after a write attempt, retain the preview after failure, and report acknowledged progress. After reloading, upload the same file and explicitly select the original records (possible matches may be deselected by default). No automatic restart or background writes occur.
- Local evidence (2026-10-25): `npm run lint`, `npm run typecheck`, `npm test` (39 tests passed), and `npm run build` passed. Tests cover all eight collections through export/preview/planning/import orchestration, malformed records/version/duplicate IDs, natural-key candidates, cross-account remapping/current ownership, selective dependencies, secret/cache exclusion, interruption/retry, and transaction payload/timestamp preservation, identical-copy retries, and changed-destination atomic aborts. Repository reads, orchestration chunk commits, and the transaction backend use test doubles; actual Firestore transaction/rules behavior and authenticated browser flows remain explicit H5/H6 gates.

### H2: Google Photos Credential Handling

Problem: [Photos service requests](../src/services/google/photos/index.ts) include access tokens in query strings and use a session-wide storage key. Account changes and credential lifetime need explicit handling.

- [x] H2.1 Move tokens from request URLs into authorization headers across picker session polling, media listing, and proxy routes. Ensure errors and logs never echo credentials.
- [x] H2.2 Scope credential state to the authenticated account. Clear tokens and account-specific media/object URLs on sign-out, account switch, disconnect, expiry, and authorization failure.
- [x] H2.3 Review API authentication, provider host/redirect restrictions, input validation, caching, and error mapping. Distinguish local disconnect from provider revocation and make Settings behavior accurate.
- [ ] H2.4 Define expired media/reselection behavior and reconnect UX. Verify consent denial, popup blocking/cancellation, token expiry, two-account switching, and unavailable references.
- [ ] H2.5 Add targeted service/route tests and verify a real Google Photos selection, save, reopen, view, download, and disconnect flow during H6.

Exit gate: tokens never appear in request URLs or exported data; one Keepl account cannot reuse another account's retained Photos state; expired credentials produce a recoverable localized state. Record provider verification separately from unit tests.

H2 implementation decisions (2026-10-25, owner: Codex):

- Credential transport: all picker creation, polling, media listing, deletion, and binary proxy requests use the Authorization bearer header. Query credentials are rejected. Provider error bodies/exceptions are replaced by fixed status codes; UI errors are localized. Routes are stateless Google capability proxies, authenticated by the caller-supplied Google bearer, with no access to Keepl records and no stored server credentials. Same-origin browser requests are enforced when Origin is supplied; no CORS access is granted.
- Credential lifetime/account isolation: credentials live only in memory, bound to the active Firebase UID, with a conservative 50-minute lifetime and no refresh token. Reloading requires reconnecting. Sign-out, account changes, local disconnect, expiry, and 401/403 clear access and revoke tracked object URLs. Legacy session-storage tokens are removed and never read. Pending media/picker responses and late consent results are rejected after an account/credential change; old failures cannot clear a newer account's credentials. Firebase reauthentication/linking requires the current authenticated user.
- Proxy restrictions: fixed Picker API origin, validated session IDs/page sizes/page tokens, HTTPS Googleusercontent media hosts without credentials, ports, query strings, or fragments, and redirects rejected. Binary responses require image/video content types. All proxy fetches/responses disable caching; the service worker explicitly uses NetworkOnly for Photos routes before its default rules.
- Recovery: popup is reserved during the user gesture; blocked popups, cancellation, timeout, consent failure, expired access, unavailable media, and download failures show localized recovery guidance. Reconnect restores credentials only; expiring provider media URLs require editing the memory, reselecting the photo, and saving. Reselection replaces the previous reference for the same provider/media ID. Saved references remain intact on local disconnect; revoking provider permission is a separate action in Google Account settings. Portable schema is unchanged; credentials remain excluded by the H1 allowlist.
- Local evidence (2026-10-25): `npm run lint`, `npm run typecheck`, `npm test` (47 tests passed), and `npm run build` passed.
- Automated evidence: targeted tests cover account isolation, late consent rejection, time expiry, denied requests, in-flight account transitions, object URL revocation, malformed input, host/origin/path validation, header-only picker creation/polling/listing/deletion, popup blocking, no-store/redirect policy, error redaction, and stale-reference replacement. Full local check results are recorded below.
- H2.4/H2.5 remain open only for real-provider verification in H6: consent denial; popup blocking/cancellation and automatic closure; token expiry; two Keepl accounts; Google authorization revocation; expired/unavailable media; and real selection, memory save, reopen, view, download, local disconnect, reconnect/reselection. Unit tests and local builds do not establish Google consent configuration, provider behavior, deployed service-worker replacement, or authenticated browser outcomes.

### H3: Localization Completion

Problem: [interactions](../src/features/interactions/interaction-manager.tsx), [person profiles](../src/features/people/person-profile-client.tsx), and other screens retain English UI text despite four-language infrastructure.

- [x] H3.1 Audit all routes and feature components, including confirmations, loading/empty/error states, placeholders, aria labels, provider errors, relationship labels, and birthday/relative-date labels.
- [x] H3.2 Replace remaining UI strings with feature-namespaced keys in en, pt, fr, and es. Use translated schema factories and locale-aware date helpers. Preserve user-authored names, labels, notes, and descriptions.
- [x] H3.3 Add message-key/interpolation parity checks and focused locale persistence, fallback, formatting, and validation checks. Keep coverage aligned with the current client-side locale strategy.
- [x] H3.4 Verify critical flows in all four languages, including layout at mobile widths and language switching without changing stored user data.

Exit gate: audited core flows have localized UI and accessible labels in all supported languages; lint, typecheck, tests, and build pass. Close the remaining FT 2 tasks only with evidence.

H3 implementation decisions and evidence (2026-10-25, owner: Codex):

- Coverage audit: all App Router pages, app shell/auth gate, and feature components were scanned for visible text, literal labels/placeholders, confirmations, error messages, and date formatting. Completed profile/detail/edit/loading screens, interactions, notes, important dates/recurrence/reminder presets, relationship editor, login, and offline UI in en/pt/fr/es. Existing localized navigation, lists, Home, Upcoming, graph, Settings, Photos, and import/export were checked. Generated birthday labels, search subtitles/default titles, missing-date labels, and last-interaction relative times now follow the active locale. Raw person/memory/interaction service error messages are replaced at the UI boundary.
- Ownership boundary: saved names, group names, relationship labels/explicit inverses, notes, descriptions, and titles remain verbatim. Only automatically inferred inverse relationship labels are localized for display; form values retain the existing data semantics. New date reminders use the authored date title without persisting an English instruction prefix. No portable fields or schema changes, record migrations, or locale-triggered domain writes were introduced.
- Client strategy: no locale routing or server locale migration. Static route metadata and the PWA manifest remain English deliberately; runtime offline content uses a client component within a server page. Browser/device locale restoration hydrates safely, tolerates unavailable local storage, and does not initially overwrite a saved preference with the server default. Profile locale loads are cancelled/invalidated when the account or explicit language choice changes. Choosing a language updates only the locale preference; failed profile persistence keeps the device preference. Submitted validation refreshes on language change without resetting form values.
- Automated coverage: exact namespace/key and interpolation parity, nonempty/validly encoded messages, English fallback, single-pass interpolation preserving user text, normalization/device persistence/storage denial, locale-aware formatting/birthday/relative labels, search chrome, localized person/memory/note/date/relationship validation, and preservation of authored note/relationship values across all four locales. Tests exercise pure helpers and schemas; mounted authenticated provider/form behavior remains part of H3.4/H5/H6.
- Local evidence: `npm run lint`, `npm run typecheck`, `npm test` (61 tests passed, including 14 added H3 tests), and `npm run build` passed. Browser smoke checks on the existing local dev server covered `/login` and `/offline` in en/pt/fr/es at 375 x 812: correct document language, translated headings/readable accents, preference restoration on navigation/reload, and no horizontal page overflow.
- H3.4 authenticated local evidence (2026-10-25): after the user signed in, verified en/pt/fr/es at a 375 x 812 browser viewport. Each locale passed 13 screen checks: Home, People, new person, populated person profile, edit person, Memories, new memory, populated memory detail, edit memory, Graph, Search, Upcoming, and Export/import. Expected translated page headings and document language matched; no horizontal document overflow was found, including date/relationship validation forms, import preview, and the photo viewer. Settings language selection saved successfully in every locale; clearing the device preference and reloading restored the authenticated profile preference.
- H3.4 interactions: submitted deliberately invalid person, memory, note, date, and relationship forms in each locale and checked translated validation. Person nickname and memory description drafts remained verbatim after validation. Opened and dismissed note, date, relationship, interaction, person archive/delete, and memory delete confirmations; all matched the active translations and interpolated the authored names/titles correctly. Verified populated and no-match search, valid backup preview with duplicate candidates, and malformed-import errors without confirming an import. Verified Photos recovery text, viewer accessible name/navigation/count, close action, and the localized failed-download error while Photos access was disconnected. Birthday date formatting, generated birthday labels, last-interaction labels/kinds, and preservation of authored notes/relationship labels passed in all four locales.
- H3.4 data invariant: compared canonical SHA-256 checksums of all eight portable collections before and after the locale/interaction checks. Both were `a5cddd3c739ba3fda7b530fc810139600257f629a6373df78b12239a336c2101`. The 18 records (4 people, 2 groups, 3 relationships, 2 important dates, 1 note, 2 memories, 2 interactions, 2 reminders), including timestamps, were unchanged. Only the language preference was intentionally saved; English was restored afterward. Temporary browser verification storage was removed.
- Evidence limits: these are non-destructive localization checks in the existing local dev session, not deployed beta verification. No valid domain create/update/delete or import was committed, and no Google consent/reconnect/successful media download was exercised; retain those H2/H5/H6 gates. Draft preservation was checked through validation, not live in-form language switching: the language selector is on Settings, so this pass does not establish draft persistence across route changes or cross-tab synchronization. No new code or automated tests were added during this verification; the passing H3 lint/typecheck/61-test/build results above remain the implementation evidence.
- Non-blocking language polish observed: older export/import translations omit some accents (for example French `Telecharger` and Portuguese `copia`/`portatil`). These did not prevent the tested flows; a native-language copy review can refine them before release.

### H4: Data Lifecycle and Failure States

Problem: [person deletion](../src/features/people/person-profile-client.tsx) removes only the person; related records can remain. Several loaders convert request failures into apparently empty sections.

- [x] H4.1 Document archive versus delete behavior for notes, important dates, reminders, interactions, relationships, and shared-person memories. Preserve memories belonging to other people; define reference removal explicitly.
- [x] H4.2 Implement the deletion policy with owner-scoped dependency discovery, an accurate confirmation, and atomic or recoverable cleanup. Add a review path for pre-existing orphan records; never run destructive repair automatically.
- [x] H4.3 Replace swallowed errors with localized loading, empty, partial-failure, and retry states on profiles, Home, Upcoming, and other affected screens. Handle mutation failures and prevent accidental duplicate submissions.
- [x] H4.4 Test deletion with multiple-person memories, archived people, denied requests, interrupted cleanup, and retries. Verify related reminders disappear when their source is removed.

Exit gate: deletion has defined and tested consequences, retries are safe, and failed reads cannot masquerade as an empty account. Align reference handling with H1.

H4 implementation decisions and local evidence (2026-10-25, owner: Codex):

- Policy: [data lifecycle and recovery](./data-lifecycle.md) defines archive, person/date/memory deletion, orphan review, and retry behavior. Archive retains data and reminder scheduling. Person deletion removes owned notes/dates/interactions/relationships and directly/date-linked reminders, preserves all memories, and detaches only the deleted person's ID. Date/memory deletion removes related reminders. Person deletion is preview-first; legacy orphan repair is a separate explicit Settings review and confirmation.
- Recovery/concurrency: the source is marked `deletionPending` after confirmation and deleted last. Current repository and import transactions reject new references to missing, foreign, or pending sources, including transitive reminder dependencies. Initial discovery failures write nothing; later failures retain the pending source for recovery. Cleanup rechecks reviewed content, uses chunks of at most 50 records/about 4 MB, and reports acknowledged progress. Earlier chunks remain after failure; review again to resume. No automatic rollback, unlock, or orphan repair. The marker is excluded from H1 exports and rejected on import; portable schema/version and domain fields are unchanged. Client guards do not replace the H5 rules gate or protect against old clients/direct external writes.
- Failure UI: localized loading/full-failure/partial-failure/retry states on Home, Upcoming, profiles, lists, Search, Graph, edit screens, and form choices. Incomplete results are hidden rather than rendered as empty. Loads ignore stale responses. Mutation controls have synchronous submission locks; draft creates retain stable request IDs and reject changed destinations rather than overwriting. Date/reminder partial saves can be retried with the same draft. Date reminder loading failures block accidental overwrites of an unknown reminder preset. Background profile updates no longer overwrite a new locale selection or silently report persistence when the profile is missing.
- Automated evidence: `npm run lint`, `npm run typecheck`, `npm test` (75 tests passed), and `npm run build` passed. Lifecycle and transaction-port tests cover archived sources, shared/sole-participant memory preservation, source-only reminder references, ownership, missing/pending/transitive references, denied reads, fresh-review retries after interruption/ambiguous commits, changed previews, restored dependencies, and full/partial read failures. H1 coverage also verifies marker exclusion/rejection and guarded imports. The transaction backend is exercised with atomic in-memory doubles; real Firestore/rules behavior remains H5/H6.
- Browser evidence: signed-in local person-deletion preview and Settings orphan review passed in en/pt/fr/es at 375 x 812 without horizontal overflow. The existing profile preview correctly proposed eight deletions and one preserved-memory reference update. Every preview was canceled; no personal records were deleted. Destructive real-backend flows, forced mutation/read denial UI, cross-account transitions, and deployed concurrency/rules remain H5/H6 gates. These local checks establish implementation evidence, not beta release verification.

### H5: Automated Assurance and Data Access

- [x] H5.1 Add CI for lint, typecheck, tests, and production build using documented, non-secret test configuration. Keep live credentials out of logs and test fixtures.
- [x] H5.2 Add reproducible Firebase rules/index configuration and emulator tests for unauthenticated access, cross-owner reads/writes, owner reassignment, and intended queries. Verify deployed configuration separately in H6.
- [x] H5.3 Add browser coverage for sign-in/route protection and people, relationships, memories, reminders, import preview/confirmation, locale changes, and account transitions. Use isolated test data; keep external OAuth/device checks as explicit manual evidence where automation is unsuitable.
- [x] H5.4 Measure representative small and large datasets, then bound list reads with pagination/cursors and appropriate indexes. Preserve search completeness: define a bounded local index or server search strategy rather than searching only the first list page. Record dataset size, reads, and latency before/after.
- [x] H5.5 Ensure automated regression coverage exercises the H1-H4 risks, including actual repository/rules behavior rather than only pure ownership helpers.

Exit gate: checks run reproducibly in CI; emulator security tests pass; common screens have documented read budgets and tested pagination/search behavior. No unmeasured scale claim is required to close a milestone.

H5 implementation decisions and local evidence (2026-10-25, owner: Codex):

- Reproducibility: [assurance workflow](../.github/workflows/assurance.yml), [Firebase configuration](../firebase.json), checked-in [indexes](../firestore.indexes.json), rules tests and a production-build Chromium suite. Fake public Firebase settings target only `demo-keepl`; emulator mode rejects real project IDs. No live OAuth account, service account, or secret is needed. Full commands, limits, query/index mappings and measurement methodology are in [automated assurance](./automated-assurance.md). Hosted CI execution and deployed rule/index availability are separate H6 evidence.
- Actual rules/repository coverage found and fixed a create/import blocker: transactions read missing destinations before writing, but the old rules denied those reads. Authenticated missing-document checks now work; existing foreign-owner data, unauthenticated reads, unscoped queries and ownership reassignment remain denied. Emulator tests cover all eight domain collections, profiles, intended queries, real repository create/update/reference guards, import retry/atomic conflict behavior, timestamps, and cursor/index boundaries.
- Rollout correction and verification (2026-10-25): the first real-project run exposed missing composite indexes on Home, Memories and Upcoming. Deployed the manifest to `keepl-9bfc7`, confirmed all 12 indexes READY, and verified all three routes load with the existing authenticated session against real Firestore data. Required indexes must be deployed and become READY before new query shapes run against any real project, including local development. The legacy groups ownerId/name index is preserved in the checked-in manifest. Emulator success alone is not index-readiness evidence.
- Read strategy: each list request uses an owner predicate, a snapshot cursor, a stable document-ID tie break, and at most 100 documents. Normal local indexes stop at 2,000 matching records per collection and probe one additional document; overflow fails visibly rather than producing incomplete search. Search consumes every page within this explicit beta capacity. Backup, import duplicate review and lifecycle review explicitly scan all owned records in pages, preserving portability and deletion correctness above the normal screen capacity. Recent memories/interactions now use server ordering/limits; person memories/interactions filter on the server.
- Measurement: synthetic 30- and 2,000-interaction owner datasets on the local Firestore emulator. Previous recent-list reads returned 30/2,000 documents in 31.1/313.9 ms; the limit-20 repository path returned 20/20 in 32.7/63.7 ms. Full local indexes still read every document, in 1/21 requests respectively. These are diagnostic emulator samples, not production latency or unlimited-scale claims. Per-screen budgets and reproduction commands are documented.
- Browser evidence: real Firebase emulator sign-in and route protection; people, relationships, date/reminder and memory writes; import preview with backend evidence of no write until confirmation; deletion review preserving attached memories; locale switching/reloading in en/pt/fr/es; sign-out and a second account unable to list/read the first account's people. The suite also caught and fixed a duplicate login redirect that could override the user's next navigation after sign-in. Emulator-only long polling avoids browser streaming transport stalls; production Firebase transport is unchanged.
- Local checks passed: `npm run lint`, `npm run typecheck`, `npm test` (75 tests), `npm run test:rules` (13 emulator tests), `npm run build:test` (production Next.js compilation with fake configuration), `npm run test:e2e` (1 Chromium scenario covering the flows above), and `npm run test:benchmark`. Existing H1-H4 unit regressions remain in CI. Real Google consent/Photos, deployed configuration and physical-device/PWA behavior remain H6 gates.

### H6: Beta and Release Verification

- [ ] H6.1 Verify environment setup, Firebase authorized domains, deployed rules/indexes, Google OAuth scopes/consent, and route configuration in the intended beta environment.
- [ ] H6.2 Run the full journey: sign in, create people/groups, connect relationships, add notes/dates/reminders, create/edit a multi-person memory with Photos, search/view graph, export, preview/restore, archive/delete, sign out, and switch accounts.
- [ ] H6.3 Verify mobile/desktop layouts, keyboard and screen-reader basics, all four locales, Android Chrome installation/offline fallback, and iOS Safari behavior. Check offline/sign-out transitions do not expose another account's cached content; distinguish an offline fallback from supported offline editing.
- [ ] H6.4 Record dated results, environment/device details, remaining defects, and pass/fail outcomes in this document. Resolve release blockers and define accepted limitations explicitly.
- [x] H6.5 Re-run lint, typecheck, tests, and production build after fixes; update setup instructions and feature statuses to match verified behavior.

Exit gate: H1-H5 are closed with evidence; the beta journey passes; no unresolved data-loss, cross-account exposure, or critical-flow defects remain. This is the gate for broader release, not a claim that deployment is already verified.

H6 implementation and evidence (2026-10-25, owner: Codex):

- Environments: Windows host, Node 22.16, Java 25, Firebase emulators using isolated `demo-keepl` data, Chromium 156 and Playwright WebKit 27.2 with an iPhone 13 preset. Browser tests exercise production compilation, not `next dev`. Public-shell widths are 375 and 1280 pixels; authenticated accessibility checks use 375 pixels. WebKit/touch emulation is not physical iOS Safari evidence. The shared real-account app is `http://localhost:3000`, connected to `keepl-9bfc7`. The project's authorized Vercel domain `https://keepl-iota.vercel.app` was inspected as the beta candidate; no new application version was published during this verification.
- Deployment gate: added `npm run verify:firebase -- PROJECT ORIGIN`. It verifies authorized domains, Google sign-in enablement, the deployed Firestore rules against the checked-in source, every required index reaching READY, public routes, the canonical manifest/install icons and a worker policy marker. Provider configuration response bodies and credentials are not printed or sent to the site being checked. Scheme/metadata/asset checks do not establish Google consent or device behavior.
- Firebase correction: the deployed rules still lacked H5's authenticated missing-destination check, which blocks transactional creates/restores. After emulator ownership tests passed, deployed the checked-in rules to `keepl-9bfc7` and verified a source match. All 12 indexes are READY; localhost and the Vercel candidate are authorized, and Google sign-in is enabled. An unauthenticated real Firestore document request returned 403. Created a clearly named synthetic person and note through the shared signed-in app, reviewed exactly those two records for cleanup, confirmed deletion and verified the person disappeared from the list. Existing user records were left intact.
- PWA fixes: use one canonical `/manifest.webmanifest`, redirect the older manifest URL, add 192/512 PNG install icons and a 180-pixel Apple touch icon from the existing vector, and retain the maskable SVG. Cache only immutable same-origin static assets and the generic precached offline document; documents/RSC/API/provider/cross-origin responses remain network-only. Disable start-page runtime caching and remove named legacy runtime caches on worker activation. Fixed the plugin's fallback-handler attachment so network-only navigation reaches the offline page. All four locales explicitly state that offline editing is unsupported. Test builds now use `.next-test` with a build-ID guard, avoiding collisions with the running real-config development server.
- UX/security fixes: localize the remaining Google sign-in label using existing keys; reject external/script/protocol-relative login return destinations; name search/group controls for assistive technology; fix low-contrast Settings connection badges. Locale persistence uses an existing-document update protected by rules instead of a redundant profile listener read. Schema/portable domain fields are unchanged. The React review checklist found no new conditional hooks, server-shared user state or locale-triggered domain writes.

| H6 scenario | Result and evidence scope |
| --- | --- |
| Firebase deployment configuration | PASS for the configured project: rules source match, 12 READY indexes, authorized localhost/Vercel host, Google sign-in enabled; anonymous read denied. |
| Real Firestore write smoke | PASS: create person, save note, review and delete only the synthetic person/note using the existing signed-in local app. |
| Full core journey | Automated production-build journey covers sign-in, people/group/relationship/note/date/reminder/interaction writes, multi-person memory creation/edit, search, graph, export of all eight collections, preview-only import, confirmation, archive, reviewed deletion preserving memories, sign-out, second-account isolation and cross-account restore with remapped references. Final command results are recorded below. |
| Four-language layout/accessibility | Automated login/offline headings, translated sign-in labels, locale restoration, no page overflow, keyboard focus and axe WCAG A/AA scans; authenticated mobile routes/forms also scanned. Final command results are recorded below. Actual screen-reader behavior remains NOT RUN. |
| Offline and account transitions | Production-worker tests seed and retire a legacy page cache, verify private paths are not cached, sign out offline, navigate to the generic fallback without saved records/editors, reconnect and verify a second account starts empty. Final command results are recorded below. |
| Hosted candidate artifact | FAIL / deployment pending: login/offline routes return 200, but PNG install icons return 404 and the hosted manifest/worker are older than this implementation. The release gate correctly exits nonzero despite Firebase checks passing. |
| Real Google Photos consent/media | NOT RUN: real consent denial/cancellation, revocation/expiry, two Google/Keepl accounts and select/save/edit/reopen/view/download/disconnect/reselection still require interactive provider verification. Unit/route mocks are not provider evidence. |
| Physical Android Chrome / iOS Safari | NOT RUN: installation, standalone launch, offline fallback, sign-out/relaunch/account switching, rotation and old-worker replacement need device model/OS/browser/date evidence on the updated HTTPS beta. |
| Assistive technology / hosted CI | NOT RUN: manual NVDA/VoiceOver traversal and a hosted CI execution of this change are still required. Axe and local commands do not establish these results. |

Final local command results (2026-10-25): `npm run lint`, `npm run typecheck`, `npm test` (76 passed), `npm run test:rules` (14 passed), `npm run build:test`, `npm run test:e2e` (8 passed across Chromium desktop and WebKit mobile), and `npm run build` (real configured production build) all passed. The browser suite uses isolated emulator accounts and a production build; it does not establish physical Safari/Chrome or real Google Photos behavior. Windows WebKit failure tracing is disabled because trace teardown hangs with live Firebase streams; failure screenshots remain enabled, and Linux CI retains traces. `npm run verify:firebase -- keepl-9bfc7 http://localhost:3000` passed; the equivalent command for `https://keepl-iota.vercel.app` failed on the outdated hosted manifest/icons/worker, as recorded above. H6.5 is complete; H6.1-H6.4 remain open for the release evidence below.

Release blockers and remaining evidence:

1. Publish the reviewed application build with real public Firebase configuration (never `.next-test` or emulator flags), then run the deployment gate against the selected beta origin and repeat the hosted authenticated journey. The existing Vercel candidate is still an older artifact.
2. Complete the real Photos scenario with an explicitly chosen test photo: select, attach to a new multi-person verification memory, save, edit, reopen, view, download, disconnect, reconnect/reselect; then exercise denied/cancelled consent, expiry/revocation and account switching. Record browser/account setup and outcomes without recording credentials or personal media.
3. On actual Android Chrome and iOS Safari, record device/OS/browser versions and install/standalone/offline/sign-out/account-transition outcomes. Run keyboard and screen-reader traversal of navigation, forms, validation, graph list alternative and confirmations. Simulated device settings do not close this gate.
4. Run hosted CI for the final change and attach the dated result. H1-H5 implementation evidence remains valid within its stated scope; remaining H2 provider checks are carried here rather than silently checked off.

Documented beta boundaries: no supported offline editing or notification delivery; static metadata/manifest stay English under the H3 locale strategy; local search is complete up to 2,000 matching records per collection and fails visibly above that capacity, while explicit portability/lifecycle scans remain complete. These boundaries do not waive the unresolved release checks above. H6 is not closed and broader release is not approved by this record.

## Product Stages After Hardening

### R1: Core UX Polish

- [ ] Bring memory tag/label entry into a reusable selection/create pattern like people groups, while preserving user-owned tag values and portability. Decide whether a new collection is actually necessary before changing the data model.
- [ ] On small screens, show Home, People, Memories, and Upcoming plus a More menu for other destinations/actions. Preserve the existing request to hide the current destination rather than highlight it; verify discoverability, keyboard/focus behavior, nested routes, and a localized accessible menu.
- [ ] Clarify the earlier request to set a relationship with a newly created person: decide whether this means connecting existing people during creation or representing the current user in the people model, then implement the agreed flow.
- [ ] Verify upcoming birthdays on Home, which already uses the shared upcoming-items builder; fix missing behavior only if verification finds a gap.

Exit gate: agreed UX flows work at mobile and desktop sizes, in four locales, with unchanged user data and updated portability coverage where needed.

### R2: Calendar and Contacts

Deliver FT 7 first: service boundary, explicit permission, one chosen event, recurrence, then disconnect/revoke. Next deliver selected-contact import under FT 8 with preview, matching, and field-level choices before adding one-way refresh. Two-way sync remains a separate decision.

Exit gate: permissions are progressive; duplicate calendar events and destructive contact overwrites are prevented; denied/revoked access is recoverable; owner-scoped external metadata is portable without credentials. Settings must show real capability and connection state.

### R3: Smart Reminders and Notifications

Deliver FT 6 suggestions and user controls before notification transport. First define recurring scheduling, timezone/DST behavior, deduplication, dismiss/snooze/complete behavior, and source deletion. Then select delivery infrastructure and implement explicit opt-in, quiet periods, revocation, retries, and delivery status.

Exit gate: suggestions become reminders only by user choice; scheduling is tested across timezone and recurrence boundaries; retries do not duplicate notifications; no relationship scoring is introduced.

### R4: AI Assistance and Semantic Search

Deliver FT 4 draft-only entry, then FT 5 note extraction using the same review/confirmation pattern, then FT 3 opt-in semantic indexing. Before provider calls, document data sent externally, consent, retention, cost limits, and failure behavior. Keep credentials and processing/index state out of portable exports unless explicitly reviewed.

Exit gate: uncertain identities require a choice; proposed changes are validated and confirmed; rejected drafts write nothing; deletion invalidates derived state; every source/result remains owner-scoped.

### R5: Additional Providers and Social Integrations

Use FT 10 for additional photo providers and FT 11 for permitted social enrichment. Retain the request for Microsoft and iCloud login, contacts, and photos as a provider feasibility track: document supported APIs, platform restrictions, consent/revocation, and account linking before promising a provider. Implement only feasible capabilities one provider at a time.

Exit gate: the app reports actual provider capabilities, handles account linking safely, never scrapes social data, and preserves reference-only photos and selective contact import.

### R6: Encryption and Sharing

Deliver FT 15 only after an encryption/key-recovery design addresses search, export/restore, and lost keys. Deliver FT 13 only after a separate access-control design specifies invitation, revocation, source ownership, and interactions with encrypted fields.

Exit gate: encryption recovery/failure cases and owner/invitee/revoked/anonymous access are tested; sharing cannot leak linked private people data; existing private-by-default behavior remains intact.

## Roadmap Maintenance

- Update this document in the same change that changes feature behavior or scope. Preserve FT numbers for stable references.
- Check off only demonstrated work; record verification date, command/test or manual scenario, and relevant limitations. Historical checked items do not substitute for the hardening gates above.
- When starting a stage, record its owner, status, prerequisites, and concrete implementation decisions here. Do not mark work in progress merely because it is planned.
- Add new user-owned fields/collections to versioned export/import and ownership tests as required by [project instructions](../AGENTS.md). Never import provider permissions, credentials, or transient processing state.
- All UI work requires en/pt/fr/es messages, locale-aware formatting, accessible states, and the four project checks. Read the installed Next.js guides before implementation.
- Keep the README as the entry point and the original implementation plan as history; avoid separate competing priority lists.

## Feature Specifications

The FT sections below retain the original feature scope and task history. The status table, H/R stages, and their release gates above govern current delivery priority and completion.

These features should be implemented one at a time. Each feature must preserve Keepl's core principles:

- Person first, calendar second.
- Private by default.
- No public profiles or public discovery.
- No personal photo binaries in Firebase Storage.
- No automatic import of contacts, photos, or social data.
- User-owned records must remain isolated by `ownerId`.
- AI and integrations should assist memory, not judge relationships.

## Current Baseline

The MVP foundation is complete:

- Next.js App Router application.
- Firebase Authentication with Google Sign-In.
- Firestore repositories using owned records.
- Firestore rules restricting user-owned collections by `ownerId`.
- People, relationships, important dates, notes, memories, groups, interactions, reminders, PWA basics, and settings foundations.

Existing ownership pattern:

- Repository methods receive `ownerId`.
- User-owned records include `ownerId`.
- Firestore rules allow create only when `request.resource.data.ownerId == request.auth.uid`.
- Firestore rules allow read, update, and delete only when `resource.data.ownerId == request.auth.uid`.

## Global Firestore Ownership Rules

Apply these rules to every deferred feature unless a later phase explicitly designs a more restrictive model.

- [ ] Every top-level user-owned collection includes `ownerId`.
- [ ] Every repository query scopes by `ownerId`.
- [ ] Every create payload sets `ownerId` from the authenticated user, not from user-entered form data.
- [ ] Every update preserves `ownerId`.
- [ ] Client UI never trusts route params alone; records must be loaded through owner-scoped repositories.
- [ ] Firestore rules are updated before exposing any new collection in UI.
- [ ] New collections are denied by default until explicitly added to `firestore.rules`.
- [ ] No public reads are added.
- [ ] No anonymous writes are added.
- [ ] Imported external IDs are stored only in owner-scoped documents.

When a feature needs shared data, encryption, or server-side processing, treat that as an architecture change and create a feature-specific security review before implementation.

## Target Source Structure

Add feature code using the existing project layout.

```text
src/
  app/
    (app)/
      search/
      graph/
      import/
      export/
      settings/
  components/
    ai/
    graph/
    integrations/
    privacy/
    search/
  features/
    ai-entry/
    ai-extraction/
    calendar/
    contacts-sync/
    encryption/
    export-import/
    graph/
    localization/
    photo-providers/
    search/
    shared-memories/
    smart-reminders/
    social-integrations/
  lib/
    ai/
    crypto/
    dates/
    i18n/
    search/
  repositories/
  services/
    google/
      calendar/
      contacts/
      photos/
    icloud/
    meta/
    export/
    import/
  types/
```

Keep shared domain types in `src/types`. Keep provider-specific API code in `src/services`. Keep UI workflows in `src/features`.

## Feature Track 1: Text Search

Status: Implemented (local text search); scale verification in H5

Goal:

Allow users to search people, notes, dates, memories, groups, and interactions with plain text while keeping all results owner-scoped.

Phases:

- [x] Phase 1: Define `SearchResult` and `SearchScope` types.
- [x] Phase 2: Create a local search service over already-owned Firestore results.
- [x] Phase 3: Add `/search` route or global search command UI.
- [x] Phase 4: Search people by names, nicknames, contact fields, groups, notes, and memory titles.
- [x] Phase 5: Add result ranking based on direct person match, pinned notes, recent memories, and upcoming dates.
- [x] Phase 6: Add tests for matching, ranking, empty queries, and owner-scoped inputs.

Possible files:

- `src/features/search/search-client.tsx`
- `src/lib/search/local-search.ts`
- `src/types/search.ts`

Acceptance criteria:

- Search never returns another user's records.
- Empty and no-result states are useful.
- Results clearly identify type: person, note, memory, date, interaction, or group.
- Search remains usable before any AI or semantic search is added.

## Feature Track 2: Multi-Language Support

Status: Verified locally (H3, 2026-10-25); deployed release verification in H6

Goal:

Make Keepl available in English, Portuguese, French, and Spanish while keeping user data unchanged and avoiding language-specific assumptions in domain logic.

Phases:

- [x] Phase 1: Establish the existing typed i18n context compatible with the current Next.js App Router version.
- [x] Phase 2: Define supported locales: `en`, `pt`, `fr`, and `es`.
- [x] Phase 3: Add translation message files and a typed translation access pattern.
- [x] Phase 4: Add locale detection, persistence, and a language selector in Settings.
- [x] Phase 5: Complete translation coverage across app shell, navigation, forms, validation, empty states, and errors (H3 local implementation and authenticated H3.4 verification).
- [x] Phase 6: Finish the date, time, recurrence, and relative-label audit using the existing locale-aware helpers (H3).
- [x] Phase 7: Verify existing fallback behavior and add locale persistence, formatting, and critical-form coverage (H3/H3.4 local evidence above); no locale-routing migration is planned.

Possible files:

- `src/features/localization/language-settings.tsx`
- `src/lib/i18n/config.ts`
- `src/lib/i18n/messages/en.json`
- `src/lib/i18n/messages/pt.json`
- `src/lib/i18n/messages/fr.json`
- `src/lib/i18n/messages/es.json`
- `src/types/i18n.ts`

Acceptance criteria:

- Users can choose English, Portuguese, French, or Spanish from Settings.
- The selected language persists for the authenticated user or local session.
- Locale changes do not alter stored person, memory, note, date, or relationship data.
- Dates and relative labels use locale-aware formatting.
- Missing translations fall back predictably and are visible during development.
- Validation and error messages are translated for core people, memories, dates, notes, and settings flows.

## Feature Track 3: Semantic Memory Search

Status: Planned

Goal:

Add meaning-based search for memories and notes after plain search is stable.

Phases:

- [ ] Phase 1: Choose embedding strategy and document privacy tradeoffs.
- [ ] Phase 2: Define `searchIndexes` or `semanticIndexes` collection shape.
- [ ] Phase 3: Add opt-in indexing state in Settings.
- [ ] Phase 4: Generate embeddings only for records owned by the current user.
- [ ] Phase 5: Search memories and notes semantically.
- [ ] Phase 6: Add stale-index detection when source records change.
- [ ] Phase 7: Add tests for index ownership and deletion cleanup.

Possible Firestore collection:

- `semanticIndexes`

Suggested fields:

- `id`
- `ownerId`
- `sourceCollection`
- `sourceId`
- `sourceUpdatedAt`
- `embeddingProvider`
- `embeddingModel`
- `textHash`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- Semantic indexing is opt-in.
- Source text is not duplicated unnecessarily.
- Deleting a source record deletes or invalidates its semantic index.
- Search results still load source records through owner-scoped repositories.

## Feature Track 4: AI Natural-Language Data Entry

Status: Planned

Goal:

Let users type phrases like "Add dinner with Ricardo last Friday, talked about his new job" and convert them into draft people, notes, interactions, dates, or memories.

Phases:

- [ ] Phase 1: Define `AiDraft`, `AiDraftAction`, and supported action types.
- [ ] Phase 2: Build a draft-only parser service boundary.
- [ ] Phase 3: Add review UI where the user confirms every generated change.
- [ ] Phase 4: Support creating notes and interactions first.
- [ ] Phase 5: Support associating existing people by search result, not by guessed identity.
- [ ] Phase 6: Support creating memories and important dates.
- [ ] Phase 7: Add audit metadata for AI-assisted creation.

Possible Firestore collection:

- `aiDrafts`

Suggested fields:

- `id`
- `ownerId`
- `inputText`
- `status`
- `proposedActions`
- `createdRecordIds`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- AI never writes final user data without explicit confirmation.
- Ambiguous people are shown as choices.
- Generated records still go through existing repositories.
- The user can discard drafts.

## Feature Track 5: AI Extraction From Notes

Status: Planned

Goal:

Suggest structured details from freeform notes, such as important dates, preferences, reminders, relationships, and memory candidates.

Phases:

- [ ] Phase 1: Add extraction request model.
- [ ] Phase 2: Trigger extraction manually from a note or profile.
- [ ] Phase 3: Show suggestions as reviewable cards.
- [ ] Phase 4: Allow accepting one suggestion at a time.
- [ ] Phase 5: Record accepted suggestion provenance.
- [ ] Phase 6: Add rejection and dismiss states.

Possible Firestore collection:

- `extractionSuggestions`

Suggested fields:

- `id`
- `ownerId`
- `sourceType`
- `sourceId`
- `personId`
- `suggestionType`
- `payload`
- `status`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- Extraction is user-triggered or explicitly enabled.
- Suggestions are never silently applied.
- Suggestions reference owner-owned source records.
- Dismissed suggestions do not keep reappearing without source changes.

## Feature Track 6: Smart Reminders

Status: Planned

Goal:

Suggest useful reminders based on important dates, notes, interactions, and memories.

Phases:

- [ ] Phase 1: Extend reminder types without changing existing reminder ownership.
- [ ] Phase 2: Add reminder suggestions separate from scheduled reminders.
- [ ] Phase 3: Suggest reminders from pinned notes and upcoming important dates.
- [ ] Phase 4: Suggest follow-ups from stale interactions.
- [ ] Phase 5: Add user controls for frequency and quiet days.
- [ ] Phase 6: Add notification delivery only after scheduling logic is reliable.

Possible Firestore collection:

- `reminderSuggestions`

Acceptance criteria:

- Suggestions are helpful but non-judgmental.
- User controls whether suggestions become scheduled reminders.
- Existing `reminders` collection remains the source of scheduled reminder truth.
- No relationship scoring language is introduced.

## Feature Track 7: Google Calendar Integration

Status: Planned

Goal:

Optionally create calendar events or reminders from important dates and memories.

Phases:

- [ ] Phase 1: Add Google Calendar service boundary.
- [ ] Phase 2: Add progressive permission request from Settings.
- [ ] Phase 3: Store integration connection state.
- [ ] Phase 4: Allow exporting one important date occurrence to calendar.
- [ ] Phase 5: Allow recurring calendar events for selected important dates.
- [ ] Phase 6: Add disconnect and revoke flow.

Possible Firestore collection:

- `integrationConnections`

Suggested fields:

- `id`
- `ownerId`
- `provider`
- `scopes`
- `status`
- `externalAccountEmail`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- Calendar scopes are not requested during sign-in.
- User chooses what to send to Calendar.
- Disconnect state is visible in Settings.
- External event IDs are owner-scoped.

## Feature Track 8: Full Google Contacts Synchronization

Status: Planned

Goal:

Move beyond selected contact import into explicit, user-controlled contact synchronization and deduplication.

Phases:

- [ ] Phase 1: Complete selected-contact import first.
- [ ] Phase 2: Define `externalContactId` and sync metadata on imported people.
- [ ] Phase 3: Add deduplication review UI.
- [ ] Phase 4: Add one-way refresh from Google Contacts.
- [ ] Phase 5: Add field-level conflict review.
- [ ] Phase 6: Decide whether two-way sync is in scope.

Possible fields on `people`:

- `source`
- `externalContactId`
- `externalUpdatedAt`
- `lastSyncedAt`

Acceptance criteria:

- The app never automatically imports the full address book.
- Users choose which contacts to import or sync.
- Existing manual people are not overwritten without review.
- Contacts permissions are progressive and revocable.

## Feature Track 9: Google Photos Picker

Status: Hardening required (H2 and H6)

Goal:

Allow users to select Google Photos media and store references or metadata without uploading photo binaries.

Phases:

- [x] Phase 1: Complete Google Photos service boundary.
- [x] Phase 2: Add progressive permission and picker launch flow.
- [x] Phase 3: Store selected media references in `PhotoReference`.
- [x] Phase 4: Attach photo references to memories.
- [x] Phase 5: Handle expired or unavailable media gracefully.
- [ ] Phase 6: Verify expired-reference recovery and reconnect/reselection behavior (H2/H6); do not assume provider URLs remain valid.

Existing target type:

- `PhotoReference`

Acceptance criteria:

- No Firebase Storage upload is introduced.
- The app does not assume Google Photos URLs are permanent.
- Memory creation still works without photos.
- Photo references are owner-scoped through the parent memory or person record.

## Feature Track 10: iCloud and Other Photo Providers

Status: Planned

Goal:

Support additional external photo providers through the same reference abstraction used by Google Photos.

Phases:

- [ ] Phase 1: Generalize photo provider interfaces.
- [ ] Phase 2: Add provider capability model.
- [ ] Phase 3: Add Settings connection state per provider.
- [ ] Phase 4: Implement one provider at a time.
- [ ] Phase 5: Add graceful fallback for unavailable thumbnails.

Acceptance criteria:

- Provider-specific code stays in `src/services`.
- Core memory UI uses `PhotoReference`, not provider-specific fields.
- No provider requires binary upload to Keepl infrastructure.

## Feature Track 11: Facebook and Instagram Enhanced APIs

Status: Planned

Goal:

Evaluate enhanced Meta integrations while keeping initial social profile linking intact.

Phases:

- [ ] Phase 1: Document permitted API use cases and privacy limits.
- [ ] Phase 2: Add Meta integration service boundary.
- [ ] Phase 3: Add progressive permission flow if a compliant use case exists.
- [ ] Phase 4: Enrich social profile metadata only with user permission.
- [ ] Phase 5: Add disconnect and data deletion behavior.

Acceptance criteria:

- No scraping is implemented.
- Friends lists are not imported automatically.
- Social profile links continue to work without API connection.
- Settings shows the real connection state.

## Feature Track 12: Relationship Graph Visualization

Status: Implemented; release verification in H6

Goal:

Visualize relationships between people without changing the underlying relationship model.

Phases:

- [x] Phase 1: Define graph node and edge view models.
- [x] Phase 2: Build local graph derivation from owned people and relationships.
- [x] Phase 3: Add person profile mini graph.
- [x] Phase 4: Add full graph route.
- [x] Phase 5: Add filters by relationship type and group.
- [x] Phase 6: Add accessibility-friendly list alternative.

Possible route:

- `src/app/(app)/graph/page.tsx`

Acceptance criteria:

- Graph data is derived from owner-owned people and relationships.
- No duplicated relationship truth is stored for visualization.
- Large graphs degrade gracefully on mobile.
- The graph avoids judgmental relationship scoring.

## Feature Track 13: Multi-User and Shared Memories

Status: Planned

Goal:

Allow explicitly shared memories in a future version without weakening private-by-default data ownership.

Phases:

- [ ] Phase 1: Write a security design document before implementation.
- [ ] Phase 2: Decide between copy-based sharing and access-control-list sharing.
- [ ] Phase 3: Define `sharedMemories` or sharing metadata.
- [ ] Phase 4: Add invitation flow.
- [ ] Phase 5: Add per-user visibility and revoke behavior.
- [ ] Phase 6: Add Firestore rules for shared access.
- [ ] Phase 7: Add tests for owner, invited user, revoked user, and unauthenticated access.

Possible Firestore collections:

- `memoryShares`
- `sharedMemoryInvites`

Acceptance criteria:

- Nothing becomes public.
- Sharing is explicit and revocable.
- Shared people data is not leaked through a shared memory.
- Firestore rules enforce access without relying only on client filtering.

## Feature Track 14: Export and Import

Status: Implemented (H1); local H5 browser/emulator checks passed; deployed transaction/rules verification in H6

Goal:

Let users export and later import their Keepl data for portability and backup.

Phases:

- [x] Phase 1: Define versioned export schema.
- [x] Phase 2: Add JSON export for all owned records.
- [x] Phase 3: Extend the existing Zod envelope validation to collection-specific record validation (H1).
- [x] Phase 4: Add dry-run preview before import.
- [x] Phase 5: Add duplicate detection.
- [x] Phase 6: Add selective import.
- [x] Phase 7: Extend basic malformed-envelope tests to migration/version policy, invalid record fields, reference remapping, ownership, and interrupted imports (H1).

Possible files:

- `src/services/export/export-data.ts`
- `src/services/import/import-data.ts`
- `src/types/export.ts`

Acceptance criteria:

- Export includes only the authenticated user's records.
- Import never writes records without preview and confirmation.
- Imported records receive the current authenticated user's `ownerId`.
- Export schema is versioned.

## Feature Track 15: Encrypted Private Fields

Status: Planned

Goal:

Support client-side encrypted fields for especially sensitive personal details.

Phases:

- [ ] Phase 1: Write an encryption design document.
- [ ] Phase 2: Decide which fields can be encrypted without breaking search and upcoming calculations.
- [ ] Phase 3: Define encrypted field envelope type.
- [ ] Phase 4: Add client-side encryption and decryption utilities.
- [ ] Phase 5: Add key creation and recovery strategy.
- [ ] Phase 6: Add migration path for existing fields.
- [ ] Phase 7: Add tests for encryption envelope, failed decrypt, and key absence.

Possible type:

```ts
type EncryptedField = {
  algorithm: string;
  keyVersion: string;
  ciphertext: string;
  nonce: string;
};
```

Acceptance criteria:

- Plaintext sensitive values are not sent to Firestore for encrypted fields.
- The UX clearly explains recovery limitations.
- Encrypted fields do not silently break core app behavior.
- Search excludes encrypted content unless a local decrypted index is explicitly designed.

## Implementation Order

Follow the H1-H6 and R1-R6 delivery sequence at the top of this document. Feature track numbers identify scope, not priority.

## Per-Feature Completion Checklist

Use this checklist before marking any deferred feature complete.

- [ ] Domain types added or updated.
- [ ] Repository/service boundaries added.
- [ ] Firestore rules updated if a collection was added.
- [ ] Required indexes documented.
- [ ] UI is mobile-first and accessible.
- [ ] Settings state is updated for any integration or permission.
- [ ] Empty, loading, success, and error states exist.
- [ ] User confirmation exists for destructive, importing, sharing, or AI-generated writes.
- [ ] No personal photo binaries are uploaded.
- [ ] No public data exposure is introduced.
- [ ] Tests cover core business logic and ownership-sensitive behavior.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes where tests exist.
- [ ] `npm run build` passes.

## Earlier Requests

Memory labels and mobile navigation are tracked in R1. Microsoft and iCloud login, contacts, and photos are tracked in R5. No separate backlog is maintained here.
