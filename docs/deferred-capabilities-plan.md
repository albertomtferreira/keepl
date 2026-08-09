# Deferred Capabilities Implementation Plan

This document tracks post-MVP capabilities deferred from `docs/implementation-plan.md`.

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

## Feature Track 1: Natural-Language Search

Status: Complete

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

Status: Not started

Goal:

Make Keepl available in English, Portuguese, French, and Spanish while keeping user data unchanged and avoiding language-specific assumptions in domain logic.

Phases:

- [x] Phase 1: Choose an i18n library compatible with the current Next.js App Router version.
- [x] Phase 2: Define supported locales: `en`, `pt`, `fr`, and `es`.
- [x] Phase 3: Add translation message files and a typed translation access pattern.
- [x] Phase 4: Add locale detection, persistence, and a language selector in Settings.
- [x] Phase 5: Replace user-facing app shell, navigation, form, validation, empty-state, and error copy with translation keys.
- [x] Phase 6: Localize date, time, recurrence, and relative-time formatting.
- [x] Phase 7: Add fallback behavior for missing translations and tests for locale routing, formatting, and critical forms.

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Complete

Goal:

Allow users to select Google Photos media and store references or metadata without uploading photo binaries.

Phases:

- [x] Phase 1: Complete Google Photos service boundary.
- [x] Phase 2: Add progressive permission and picker launch flow.
- [x] Phase 3: Store selected media references in `PhotoReference`.
- [x] Phase 4: Attach photo references to memories.
- [x] Phase 5: Handle expired or unavailable media gracefully.
- [x] Phase 6: Add provider refresh strategy if needed.

Existing target type:

- `PhotoReference`

Acceptance criteria:

- No Firebase Storage upload is introduced.
- The app does not assume Google Photos URLs are permanent.
- Memory creation still works without photos.
- Photo references are owner-scoped through the parent memory or person record.

## Feature Track 10: iCloud and Other Photo Providers

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

Goal:

Let users export and later import their Keepl data for portability and backup.

Phases:

- [x] Phase 1: Define versioned export schema.
- [x] Phase 2: Add JSON export for all owned records.
- [x] Phase 3: Add import validation with Zod.
- [x] Phase 4: Add dry-run preview before import.
- [x] Phase 5: Add duplicate detection.
- [x] Phase 6: Add selective import.
- [x] Phase 7: Add tests for schema migration and malformed imports.

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

Status: Not started

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

## Recommended Implementation Order

1. Natural-language search. (FT 1) ✅
2. Multi-language support for English, Portuguese, French, and Spanish. (FT 2) ✅
3. Relationship graph visualization. (FT 12) ✅
4. Export/import. (FT 14) ✅
5. Google Photos Picker. (FT 9) ✅
6. Google Calendar integration. (FT 7)
7. Selected Google Contacts import, then full synchronization. (FT 8)
8. Smart reminders. (FT 6)
9. AI natural-language data entry. (FT 4)
10. AI extraction from notes. (FT 5)
11. Semantic memory search. (FT 3)
12. Additional photo providers. (FT 10)
13. Facebook and Instagram enhanced APIs. (FT 11)
14. Encrypted private fields. (FT 15)
15. Multi-user and shared memories. (FT 13)

This order favors user value with low privacy risk first, then localization before more UI-heavy feature work, then integrations, then AI, then features that require deeper security architecture.

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


## Further features
- Improve the label structure from memories to mirror the structure used on the people group labels 
- focused bottom navbar on sm devices. Only have home, people, memories and upcoming. all other under a ... button that when clicked will open a box with the other options. Also, hide the page where the user is instead of highlight
- Integrate with other platforms (Microsoft and iCloud) for connect for photos and contacts and login.