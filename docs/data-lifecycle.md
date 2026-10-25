# Data lifecycle

H4 policy and local implementation, 2026-10-25. This describes current-client behavior; deployed rules and real transaction verification remain H5/H6 gates.

## Archive

Archiving sets the person's `archivedAt` and retains all other records. Active people lists exclude archived people; direct profile links still work. Notes, dates, interactions, relationships, memories, and reminders remain stored. Archiving does not cancel reminders. There is no destructive archive cascade or automatic orphan repair.

## Delete

| Deleted source | Deleted records | Preserved records |
| --- | --- | --- |
| Person, including an archived person | The person; their notes, important dates, interactions, both directions of relationships; reminders directly referencing the person or any of their dates | Every memory, including memories with no remaining participants; remove only the deleted person's ID from `peopleIds`. Other participants, descriptions, photos, tags and dates stay intact. Groups and other people remain unchanged. A reminder referencing only a preserved memory remains. |
| Important date | The date and every reminder referencing its ID | The person, their other dates and memories |
| Memory | The memory and every reminder referencing its ID | People and all other memories |
| Note, interaction, relationship | That record only | All other records |

Person deletion requires an owner-scoped dependency preview and a separate confirmation. Date and memory deletion confirmations explicitly include related reminders. In all cases discovery must succeed before cleanup starts. A failed query never becomes an empty dependency set.

## Transactions, concurrent writes, and recovery

The source record receives the internal `deletionPending` marker in an owner-checked transaction after confirmation. Its reviewed content must still match. Current repository writes read referenced sources (including reminder -> date -> person chains) in the same transaction as the write, rejecting missing, foreign-owned, or pending sources. Creates with a stable request ID acknowledge identical existing records without writing again, and reject changed destinations. Normal deletion of leaf records is owner-checked and idempotent.

After marking the source, discovery runs again. Changed dependencies invalidate the preview; the user must review again. Dependencies are removed/updated in transactions of at most 50 records and approximately 4 MB of serialized reviewed content. Each chunk checks ownership and exact reviewed content before any writes. Reminders are removed before their dates. Memories are updated by removing only the reviewed reference. A final scan must find no remaining dependencies before the source is deleted last.

Earlier chunks remain after interruption. Progress counts acknowledged dependent records only; an ambiguous response may have committed more than shown. The source and its marker remain available for retry. Reopen the source, review its current dependencies, and explicitly confirm again. Person profiles show the pending state after reload. Date/memory deletion can be retried from the same source screen. A changed preview or failure never triggers background repair or an automatic retry. After confirmation the operation is a deletion in progress, not an undoable draft; canceling a later preview does not undo prior chunks or unlock the source. Finishing deletion is the supported recovery path.

The marker is internal, non-portable state. Export's H1 field allowlist strips it; import rejects supplied markers. No export version change or new portable collection is introduced. Import chunk transactions also check references against pending/missing/foreign sources, including newly restored records in the same chunk, so dependency-ordered imports cannot bypass the deletion guard.

These guards coordinate current repository/import clients; they are not a Firestore security boundary. Old clients or direct external writes can bypass application-level guards. H5 must verify owner and reference policies in deployed/emulated rules before release. Lifecycle discovery currently reads all eight owner-scoped collections; read budgets and bounded discovery remain H5 work.

## Orphan review

Settings offers an explicit review action. It scans owner-owned records against the full owned dataset, including archived people. Missing required people references remove notes, dates, interactions and relationships. Reminders with missing person/date/memory references, or dates whose person is missing, are proposed for removal. Missing people IDs on memories and missing group IDs on people are proposed for reference removal; memories and people are retained.

The preview lists the proposed changes and totals. Nothing is written until confirmation. Transactions recheck missing dependencies, ownership, and reviewed content. A newly restored dependency or edited record aborts the affected transaction instead of silently applying a stale repair. Earlier acknowledged repair chunks may remain; review again to resume. Cross-owner documents are never modified. A denied read aborts discovery/repair rather than treating access denial as proof that a dependency is absent.

## Failure states and mutation retries

Home, Upcoming, profiles, lists, search, graph, edit screens, and form choice loaders show loading/read failure/retry states. A failed subset is reported as a partial failure; incomplete results are hidden so failed reads cannot masquerade as empty data. Stale load results are ignored on route/account changes. Genuine not-found and empty states are shown only after successful reads.

Mutation handlers have synchronous in-flight guards, disabled controls, and localized failure messages. New drafts retain their request IDs across ambiguous failures. A date save can persist before reminder replacement or list refresh fails: retry the same draft; changes across separate requests are not rolled back. Reminder replacement uses a stable source-derived reminder ID. New draft/edit sessions allocate new request IDs. Background sign-in profile updates preserve locale; a missing profile no longer reports language persistence as successful.

## Evidence

Local automated coverage exercises planning, transaction-port ownership/content checks, shared and sole-participant memory preservation, archived people, missing/foreign/pending references, orphan previews, denied reads, changed previews, chunk interruption, ambiguous dependency/final commits, retry behavior, and date/memory reminder cleanup. Export/import tests verify marker exclusion/rejection and guarded restore references. Backend tests use an atomic in-memory transaction double, not a Firestore emulator.

The authenticated local browser verified owner-scoped person-deletion previews and Settings orphan review in en/pt/fr/es at 375 x 812, with no horizontal overflow. All previews were canceled; personal records were not deleted. Actual deletion, mutation retry UI under denied requests, concurrent real clients, deployed rules, and cross-account operation remain H5/H6 verification requirements.
