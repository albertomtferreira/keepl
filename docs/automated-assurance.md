# H5 automated assurance

## Reproduce locally

Use Node 22 and Java 21 or newer. Install with `npm ci`, then run:

```sh
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build:test
npx playwright install chromium webkit
npm run test:e2e
npm run test:benchmark
```

On Linux, use `npx playwright install --with-deps chromium webkit`. Run emulator commands sequentially: they share ports 8080/9099 and the isolated `demo-keepl` project. The suites discard emulator state; never point them at a real project. No Firebase login, service account, OAuth secret, or live account is needed. The environment wrapper supplies fake public configuration before Next.js loads local env files. Browser tests use a production build, real Firebase SDKs, emulator Google sign-in, real repositories and checked-in rules; they do not bypass the app's auth provider. `build:test` creates an emulator-only build under `.next-test`, separate from the running development server: rebuild with normal deployment configuration before releasing it. The client rejects emulator mode for any project other than `demo-keepl`. Browser configuration also checks a build-ID marker written only by `build:test`, refusing to launch against a stale or live-configured build.

[CI](../.github/workflows/assurance.yml) runs lint, typecheck, all existing H1-H4 unit regressions, emulator tests, production compilation with fake configuration, and Chromium/mobile-WebKit flows. Failure traces contain only isolated test data. Firebase popup bootstrapping loads the public Google API JavaScript; no live OAuth flow or account is used. Optional emulator widget font/style CDNs are blocked. Emulator denial logs are expected assertions, not failed tests. External Google consent, Photos media delivery, installed PWA/device behavior, and deployed indexes/rules remain H6 checks. CI configuration is implemented locally; a hosted CI run is separate evidence.

The workflow accepts pull requests, pushes to `master` (the current default branch) or `main`, and manual dispatch. After publishing the workflow, use GitHub Actions → Assurance → Run workflow, or `gh workflow run assurance.yml --ref master`. Record the successful run URL and tested revision under H6. On 2026-10-27, the previously `main`-only trigger was corrected locally; GitHub reported no existing Assurance runs or check runs for the tested revision.

## Rules and indexes

[firebase.json](../firebase.json) binds the checked-in [rules](../firestore.rules) and [indexes](../firestore.indexes.json). Deployment is an explicit H6/release operation, using a deliberately chosen project:

```sh
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

Deploy required indexes **before running code that introduces new query shapes**, including a local development server connected to a real Firebase project. A passing emulator suite does not establish that these indexes exist in that project. Keep existing deployed indexes in this manifest; the legacy groups ownerId/name index is retained.

Wait for indexes to become ready, then exercise recent memories/interactions, scheduled reminders, person-filtered records, and relationships in both directions. The emulator validates rule behavior but does not enforce production composite index availability. Equality filters use ownerId plus personId, importantDateId, fromPersonId, or toPersonId. Memory membership uses peopleIds array-contains. Recent lists order by startDate/occurredAt descending; all pages use document ID ascending to break ties. Scheduled reminders use ownerId/status/remindAt.

Authenticated reads of missing domain documents are allowed so transactions can check create/import destinations. Existing foreign-owned records, unscoped collection queries, owner reassignment, unauthenticated access, and unknown collections remain denied. Rules enforce ownership; application transactions enforce domain references and lifecycle checks. They are not a general schema validator for arbitrary direct SDK clients.

## Read strategy and budgets

[OwnedFirestoreRepository](../src/repositories/base-repository.ts) exposes `listPage`, with at most 100 documents per request, snapshot cursors, a stable document-ID tie break, and the owner predicate on every page. No offsets. `list` builds a complete local index up to 2,000 matching records per collection. It probes one extra record at the ceiling and rejects overflow instead of showing incomplete search results. Screens retain their existing localized retry/failure UI. This is an explicit beta capacity boundary, not a server search implementation. Expanding it requires measurement or a server search strategy.

| Read path                                         | Maximum returned documents per load             | Requests                     |
| ------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| Home recent interactions                          | 20                                              | 1                            |
| Home recent memories                              | 3                                               | 1                            |
| Memories list                                     | 50                                              | 1                            |
| People list/filter choices                        | 2,001 per collection                            | at most 21 per collection    |
| Search local index                                | 12,006 across 6 collections                     | at most 126                  |
| Graph                                             | 2,001 per requested collection                  | at most 21 per collection    |
| Home/upcoming supporting lists                    | 2,001 per collection                            | at most 21 per collection    |
| Profile notes/dates/interactions/memories         | 2,001 matching documents per collection         | at most 21 per collection    |
| Profile relationships                             | two owner/person queries, each bounded as above | at most 42                   |
| Explicit backup, import preview, lifecycle review | complete owner collections                      | pages of 100 until exhausted |

These are document-return budgets, not billing guarantees: empty-query minimum charges, rule-dependent reads, and Firestore index-entry charges can add costs. Parallel screen requests may all complete even when one fails. There is no persistent cross-account index/cache. Account changes remount the app shell; obsolete loads are cancelled or hidden. Pagination is not a snapshot across requests: concurrent edits can change membership; import and lifecycle commits revalidate reviewed records transactionally. Local sorting/filtering/search receives all pages within capacity, not merely the first page. Existing recent lists intentionally return only their requested most-recent subset. The profile interaction and memory queries now filter by person on the server.

## Measurement (2026-10-25)

Reproduce with `npm run test:benchmark`. Windows, Node 22.16, Java 25, Firestore emulator 1.22; one warmed run per size. Synthetic owner-scoped interactions, identical before/after data. Baseline is the previous unbounded owner query followed by local recent selection; after is the production repository's ordered limit-20 path. Times include SDK decoding and local emulator round trip.

| Owner dataset | Before documents | Before ms | After documents | After ms |
| ------------- | ---------------- | --------- | --------------- | -------- |
| 30            | 30               | 31.1      | 20              | 32.7     |
| 2,000         | 2,000            | 313.9     | 20              | 63.7     |

The complete index still reads all 30 / 2,000 documents in 1 / 21 requests respectively (including the empty end probe at 2,000). Cursor paging bounds each request and memory capacity; it does not reduce the total documents required for complete local search. No production latency or unlimited-scale claim follows from this emulator sample.

## Regression coverage

- Rules: all eight collections, authenticated owner access, unauthenticated and foreign-owner reads/writes/deletes, unscoped queries, owner reassignment, user profiles, unknown collections.
- Actual repository transactions: create and identical retry, changed-payload conflict, missing references, owner isolation, pending-deletion guard.
- Actual import transaction logic against the emulator: reference preservation, timestamp preservation, identical retries, atomic failure on changed destinations and forged ownership.
- Cursor/index regressions: tied sort fields, no duplicate pages, owner isolation, explicit limits, 2,000 boundary, overflow rejection, and searching a record beyond the first page.
- Browser: protected route redirect, emulator sign-in, people, relationship, date/reminder and memory writes, import preview without writes followed by confirmation, four-locale persistence, reviewed deletion preserving attached memories, sign-out, and a second account unable to see the first account's records.
- Existing unit suite retains malformed import, interrupted recovery, Photos credential lifetime/account transitions and proxy validation, localization parity, and lifecycle failure/retry cases. These complement real SDK/rules tests; they do not replace provider/deployed verification.

Local validation on 2026-10-25 passed lint, typecheck, 75 unit tests, 13 emulator tests, the production test build, and the complete Chromium scenario (9.2 seconds for the scenario). The browser suite exposed a duplicate post-login redirect; navigation now runs through the existing auth-state effect once.

## Real-project index rollout verification (2026-10-25)

Deployed the index manifest to `keepl-9bfc7`, retaining its existing groups ownerId/name index. Confirmed all 12 configured composite indexes reached READY through the Firestore Admin API. Verified `/home`, `/memories`, and `/upcoming` on the local development app with the existing authenticated session and real Firestore data: all three completed loading without the partial-read error; memory cards and scheduled reminders rendered. This is evidence for the index rollout and these read paths only; the remaining H6 environment, deployed rules, provider and device checks remain open.

## H6 verification extensions

The production browser suite runs the complete eight-collection export/restore journey under Chromium and iPhone-preset WebKit, plus localized public-shell layout/keyboard/axe checks, authenticated mobile routes/forms, and production service-worker offline/sign-out/account-transition checks. WebKit emulation does not establish physical iOS Safari installation or VoiceOver behavior.

`npm run verify:firebase -- PROJECT ORIGIN` is a read-only release gate using the pinned Firebase CLI's authenticated API client. It checks public HTTP assets without sending Firebase credentials, and reports only metadata/booleans. A successful deployment command alone does not establish that indexes are READY or that the hosted app includes the current manifest/worker. The gate deliberately fails for stale hosted assets even when Firebase configuration passes.

The worker caches immutable same-origin static assets and the generic precached offline page. Documents, RSC payloads, API responses, provider media and cross-origin data are network-only. A custom activation handler removes named legacy runtime caches from the previous policy. Browser tests seed a legacy page cache, verify its removal, create a synthetic private record, sign out offline, navigate to the fallback, and sign into another account after reconnecting. No offline write queue or supported offline editing is introduced.
