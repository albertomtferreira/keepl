# Keepl - Keep People Close Implementation Plan

This document tracks the implementation of the private, person-centred relationship and memory manager described in `docs/prompt.md`.

Current repository state:

- Only documentation exists at the time this plan was created.
- There is no initialized Next.js application yet.
- There is no Git repository metadata in the workspace yet.
- `docs/1. Technical stack.md` was referenced by the IDE but was not present on disk.

## Product Direction

Build a production-quality PWA that helps a user remember the people and details that matter.

The central domain object is `Person`. Important dates, memories, relationships, notes, social profiles, groups, reminders, and interactions should all connect back to people.

The application should feel personal, warm, mobile-first, and uncluttered. It should not feel like a corporate CRM.

## Core Technical Decisions

- Use Next.js App Router with TypeScript strict mode.
- Use Tailwind CSS and shadcn/ui for UI foundations.
- Use Firebase Authentication with Google Sign-In.
- Use Firestore for application data.
- Do not use Firebase Storage for personal photos.
- Prepare Google Photos and Google Contacts integration boundaries, but do not implement those integrations in the first foundation pass.
- Use React Hook Form and Zod for forms and validation.
- Use date-fns for date utilities.
- Use Lucide icons.
- Configure the app as an installable PWA.

## Target Source Structure

Use this as the starting structure, adapting only when the real codebase gives a clear reason.

```text
src/
  app/
    (auth)/
      login/
    (app)/
      home/
      people/
      people/[id]/
      memories/
      memories/[id]/
      upcoming/
      settings/
  components/
    layout/
    people/
    memories/
    relationships/
    dates/
    notes/
    ui/
  features/
    people/
    relationships/
    memories/
    important-dates/
    notes/
    groups/
    interactions/
  lib/
    firebase/
    auth/
    dates/
    validation/
    utils/
  repositories/
  services/
    google/
      contacts/
      photos/
  types/
```

## Firestore Collections

Initial top-level collections:

- `users`
- `people`
- `relationships`
- `importantDates`
- `personNotes`
- `memories`
- `interactions`
- `groups`
- `reminders`

Required ownership rule:

- Every major user-owned document must include `ownerId`.
- Firestore security rules must only allow reads and writes when `request.auth.uid == resource.data.ownerId` or the create payload contains `ownerId == request.auth.uid`.
- No anonymous public reads.
- No public profile or discovery concepts.

## Phase 0: Repository Setup

Status: Complete

Tasks:

- [x] Initialize Git repository if desired by the project owner.
- [x] Initialize Next.js app in the existing workspace.
- [x] Configure TypeScript strict mode.
- [x] Configure Tailwind CSS.
- [x] Install and configure shadcn/ui.
- [x] Install Firebase, React Hook Form, Zod, date-fns, Lucide icons, and PWA tooling.
- [x] Add baseline linting and formatting scripts.
- [x] Add `.env.example`.
- [x] Add project README with local setup instructions.

Acceptance criteria:

- `npm run lint` runs.
- `npm run build` runs.
- App starts locally with the expected Next.js routes.
- Environment variables are documented without committing secrets.

## Phase 1: Foundation

Status: Complete

Tasks:

- [x] Add Firebase client configuration.
- [x] Define required Firebase environment variables.
- [x] Implement Google Sign-In.
- [x] Add login route for unauthenticated users.
- [x] Add authenticated route protection for app routes.
- [x] Create or update `users/{userId}` document after first authentication.
- [x] Add app shell with responsive layout.
- [x] Add mobile bottom navigation: Home, People, Add, Memories, Upcoming.
- [x] Add desktop/tablet navigation using the same information architecture.
- [x] Add initial routes: Home, People, Memories, Upcoming, Settings.
- [x] Add PWA manifest, theme metadata, viewport configuration, and placeholder icons.
- [x] Add Firestore security rules.

Acceptance criteria:

- User can sign in with Google.
- First sign-in creates an application user record.
- Unauthenticated users cannot access app routes.
- Authenticated users can navigate through the main shell.
- PWA metadata is present and installability basics are configured.

## Phase 2: Domain Models and Data Access

Status: Complete

Tasks:

- [x] Define shared timestamp and ownership types.
- [x] Define `UserProfile`.
- [x] Define `Person` and `PersonSource`.
- [x] Define `PhotoReference` and `PhotoSource`.
- [x] Define `Relationship`.
- [x] Define `ImportantDate`.
- [x] Define `PersonNote`.
- [x] Define `Memory`.
- [x] Define `Group`.
- [x] Define `Interaction`.
- [x] Define `Reminder`.
- [x] Create typed Firestore converters or equivalent mapping helpers.
- [x] Create repository pattern for Firestore reads and writes.
- [x] Add initial repositories for users, people, groups, important dates, notes, relationships, and memories.
- [x] Document Firestore index requirements as they emerge.

Firestore index notes:

- `people`: `ownerId ASC`, `displayName ASC` for alphabetical people lists.
- `memories`: `ownerId ASC`, `startDate DESC` for recent memories.
- `memories`: `ownerId ASC`, `peopleIds ARRAY_CONTAINS`, `startDate DESC` for person profile memories.
- `interactions`: `ownerId ASC`, `personId ASC`, `occurredAt DESC` for person interaction history.
- `reminders`: `ownerId ASC`, `status ASC`, `remindAt ASC` for scheduled reminders.

Acceptance criteria:

- UI code does not contain scattered raw Firestore query logic.
- Domain types support optional profile growth.
- Photo handling is represented by references only, not binary uploads.
- Data access always scopes records by `ownerId`.

## Phase 3: People MVP

Status: Complete

Tasks:

- [x] Build People list page.
- [x] Add search by `displayName`, `firstName`, `lastName`, and `nickname`.
- [x] Add alphabetical sorting.
- [x] Add group filter UI placeholder or initial implementation.
- [x] Build Add Person flow.
- [x] Keep creation form minimal: first name, last name, nickname, birthday, phone, email, groups.
- [x] Redirect to person profile after creation.
- [x] Build person profile route.
- [x] Add profile sections for About, Important Dates, Notes, Relationships, Memories, Social Profiles, and Groups.
- [x] Prefer compact empty sections with edit actions over large empty forms.
- [x] Build Edit Person flow.
- [x] Add archive or delete capability.

Acceptance criteria:

- User can create, view, edit, search, and archive/delete people.
- Person profile is useful even with sparse information.
- No direct photo upload exists.
- Profile design remains mobile-first and personal rather than CRM-like.

## Phase 4: Important Dates and Notes

Status: Complete

Tasks:

- [x] Implement date model that supports full dates and dates without a year.
- [x] Add important date CRUD.
- [x] Add notes CRUD.
- [x] Add pinned notes.
- [x] Show important dates and pinned notes on person profile.
- [x] Build date utilities for annual recurrence and next occurrence calculations.
- [x] Build Upcoming page grouped by Today, This Week, This Month, and Later.
- [x] Add tests for date utilities and upcoming calculations.

Implementation notes:

- Important dates are managed inline from the person profile.
- Notes are managed inline from the person profile and can be pinned or unpinned.
- `FlexibleDate` supports month/day dates without known years for birthdays and recurring events.
- Upcoming dates are calculated client-side from owned important dates and active people, then grouped by Today, This Week, This Month, and Later.
- Focused date utility tests run through `npm test`.

Acceptance criteria:

- Birthdays without known years work.
- Recurring annual dates calculate future occurrences correctly.
- Upcoming page displays useful relative timing.
- Notes remain lightweight and easy to add.

## Phase 5: Relationships

Status: Complete

Tasks:

- [x] Implement relationship repository.
- [x] Add relationship creation between two existing people.
- [x] Add inverse relationship helper functions.
- [x] Query relationships where a profile person appears as either side.
- [x] Display relationship labels correctly from the current person's perspective.
- [x] Add edit and delete relationship actions.
- [x] Add tests for inverse relationship resolution.

Implementation notes:

- Relationships are managed inline from the person profile.
- Relationship records connect `fromPersonId` and `toPersonId`; names are resolved from owned people at render time.
- Perspective labels use an explicit `inverseLabel` when present and otherwise fall back to common inverse relationship helpers.
- Profile relationship loading queries both `fromPersonId` and `toPersonId`, scoped by `ownerId`.

Acceptance criteria:

- Relationships connect person records by ID, not names as text.
- Common inverse relationships display correctly.
- Person profile shows connected people with useful relationship context.

## Phase 6: Memories

Status: Complete

Tasks:

- [x] Implement memory repository.
- [x] Use `peopleIds: string[]` for MVP many-to-many memory association unless a stronger Firestore reason appears.
- [x] Document Firestore query and index implications for `peopleIds`.
- [x] Build Memories list page.
- [x] Build Add Memory flow.
- [x] Include title, start date, optional end date, associated people, location, description, tags, and photo integration placeholder.
- [x] Add searchable multi-person selector.
- [x] Build memory detail page.
- [x] Show memories on associated person profiles.
- [x] Show recent memories on Home.
- [x] Add Google Photos service boundary and placeholder UI.

Implementation notes:

- Memories use a `peopleIds: string[]` field so one memory can appear on multiple person profiles.
- Memories currently load with `ownerId == currentUser.uid`, then sort and filter client-side to avoid requiring composite indexes before the app has enough data to need them.
- Future Firestore indexes, once memory volume requires server-side sorting/filtering:
  - `memories`: `ownerId ASC`, `startDate DESC` for recent memories.
  - `memories`: `ownerId ASC`, `peopleIds ARRAY_CONTAINS`, `startDate DESC` for person profile memories.
- Google Photos is represented by a service boundary and placeholder UI only; no binary upload or Firebase Storage path was added.

Acceptance criteria:

- User can create, view, edit, and delete memories.
- A memory can be associated with multiple people.
- Memory appears on each associated profile.
- Photos are reference-only and the system works without photos.

## Phase 7: Groups and Interactions

Status: Complete

Tasks:

- [x] Implement groups repository.
- [x] Provide suggested default group names without forcing them.
- [x] Allow people to belong to multiple groups.
- [x] Add group filtering to People.
- [x] Implement basic interaction model and repository.
- [x] Add optional lightweight interaction creation.
- [x] Add last-interaction calculation if interaction data exists.
- [x] Build Home "Worth Remembering" foundation using pinned notes and optionally older interactions.

Implementation notes:

- Groups are user-owned Firestore records and people store multiple `groupIds`.
- The People form now uses existing group records as selectable checkboxes, offers optional suggested group names, and supports inline custom group creation.
- People list filtering uses owned groups sorted alphabetically.
- Interactions are lightweight records with a kind, date, and optional summary, managed inline from a person profile.
- Interaction listing currently loads owner-scoped records and sorts client-side to avoid forcing a composite index during the MVP.
- Home includes a "Worth remembering" foundation that surfaces pinned notes and interactions older than 30 days.

Acceptance criteria:

- People can belong to multiple groups.
- Groups are user-owned and customizable.
- Interactions remain lightweight and clearly distinct from richer memories.

## Phase 8: Settings and Integration Boundaries

Status: Complete

Tasks:

- [x] Build Settings page sections: Account, Google, Contacts, Photos, Calendar, Notifications, Privacy, Data.
- [x] Show connected Google account details.
- [x] Add Google Contacts service boundary.
- [x] Add Google Photos service boundary.
- [x] Represent integrations as Connected, Not connected, or Permission required.
- [x] Do not request Contacts, Photos, or Calendar permissions during initial sign-in.

Implementation notes:

- Settings now renders account details from the authenticated Firebase user.
- Google sign-in is shown as connected only when the current user has a `google.com` provider.
- Contacts and Photos have typed service-boundary status helpers and return Permission required until a future connection flow exists.
- Calendar and notification permissions are represented as future progressive-permission states.
- Firebase Google sign-in remains limited to basic sign-in and does not add Contacts, Photos, or Calendar scopes.

Acceptance criteria:

- Settings clearly communicates current and future integration states.
- No integration is presented as connected unless it actually is.
- Progressive permission architecture is prepared.

## Phase 9: Reminder Architecture and PWA Polish

Status: Complete

Tasks:

- [x] Implement reminder model and repository.
- [x] Add reminder presets to important dates where practical.
- [x] Store reminder records with status.
- [x] Defer push notifications unless the foundation is already stable.
- [x] Improve installable PWA behavior.
- [x] Add offline-friendly shell where sensible.

Implementation notes:

- Reminder records are user-owned Firestore documents with a `scheduled` status and optional links back to people and important dates.
- Important date forms can now create reminder records for same day, 1 day, 1 week, 2 weeks, or 1 month before the next occurrence.
- Updating an important date replaces its existing reminder records; deleting an important date deletes the linked reminders.
- Upcoming now shows scheduled reminders alongside upcoming dates.
- Push notifications remain deferred; this phase only creates data and visible UI for future notification delivery.
- The PWA manifest includes app identity metadata and shortcuts, and the service worker uses `/offline` as a document fallback.

Acceptance criteria:

- Reminder data can be created for future notification support.
- PWA shell feels usable on Android Chrome and does not intentionally break desktop or iOS browser use.

## Phase 10: Seed Data and Quality Gates

Status: Not started

Tasks:

- [ ] Add optional development seed data.
- [ ] Include fictional people: Ricardo Silva, Maria Silva, Pedro Fernandes, Joao Costa, Sofia Silva.
- [ ] Include sample relationships, birthdays, notes, groups, and Porto Weekend memory.
- [ ] Ensure seed data never runs automatically for production users.
- [ ] Add targeted tests for date calculations, inverse relationships, validation, and ownership-sensitive repository behavior where feasible.
- [ ] Run lint.
- [ ] Run TypeScript checks.
- [ ] Run relevant tests.
- [ ] Run production build.
- [ ] Fix blocking errors before considering a milestone complete.

Acceptance criteria:

- Development UI can be tested with realistic sample data.
- Core business logic has focused tests.
- Production build succeeds.

## Deferred Capabilities

Do not implement these during the MVP unless explicitly reprioritized:

- AI natural-language data entry.
- AI extraction from notes.
- Natural-language search.
- Semantic memory search.
- Relationship graph visualization.
- Smart reminders.
- Google Calendar integration.
- Full Google Contacts synchronization.
- Facebook or Instagram enhanced APIs.
- iCloud or other photo providers.
- Multi-user or shared memories.
- Export/import.
- Encrypted private fields.

## Immediate Next Step

Start with Phase 5:

1. Implement relationship creation between existing people.
2. Add inverse relationship helpers and current-person perspective labels.
3. Validate with lint, TypeScript checks, targeted tests, and production build.


## Improvements
- The user should be able to set a relationship with the created person
- Upcoming birthdays on home
- Settings - Contacts/Photos/Calendar/Notifications - Implement
