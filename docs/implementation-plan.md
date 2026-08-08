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

Status: Not started

Tasks:

- [ ] Initialize Git repository if desired by the project owner.
- [ ] Initialize Next.js app in the existing workspace.
- [ ] Configure TypeScript strict mode.
- [ ] Configure Tailwind CSS.
- [ ] Install and configure shadcn/ui.
- [ ] Install Firebase, React Hook Form, Zod, date-fns, Lucide icons, and PWA tooling.
- [ ] Add baseline linting and formatting scripts.
- [ ] Add `.env.example`.
- [ ] Add project README with local setup instructions.

Acceptance criteria:

- `npm run lint` runs.
- `npm run build` runs.
- App starts locally with the expected Next.js routes.
- Environment variables are documented without committing secrets.

## Phase 1: Foundation

Status: Not started

Tasks:

- [ ] Add Firebase client configuration.
- [ ] Define required Firebase environment variables.
- [ ] Implement Google Sign-In.
- [ ] Add login route for unauthenticated users.
- [ ] Add authenticated route protection for app routes.
- [ ] Create or update `users/{userId}` document after first authentication.
- [ ] Add app shell with responsive layout.
- [ ] Add mobile bottom navigation: Home, People, Add, Memories, Upcoming.
- [ ] Add desktop/tablet navigation using the same information architecture.
- [ ] Add initial routes: Home, People, Memories, Upcoming, Settings.
- [ ] Add PWA manifest, theme metadata, viewport configuration, and placeholder icons.
- [ ] Add Firestore security rules.

Acceptance criteria:

- User can sign in with Google.
- First sign-in creates an application user record.
- Unauthenticated users cannot access app routes.
- Authenticated users can navigate through the main shell.
- PWA metadata is present and installability basics are configured.

## Phase 2: Domain Models and Data Access

Status: Not started

Tasks:

- [ ] Define shared timestamp and ownership types.
- [ ] Define `UserProfile`.
- [ ] Define `Person` and `PersonSource`.
- [ ] Define `PhotoReference` and `PhotoSource`.
- [ ] Define `Relationship`.
- [ ] Define `ImportantDate`.
- [ ] Define `PersonNote`.
- [ ] Define `Memory`.
- [ ] Define `Group`.
- [ ] Define `Interaction`.
- [ ] Define `Reminder`.
- [ ] Create typed Firestore converters or equivalent mapping helpers.
- [ ] Create repository pattern for Firestore reads and writes.
- [ ] Add initial repositories for users, people, groups, important dates, notes, relationships, and memories.
- [ ] Document Firestore index requirements as they emerge.

Acceptance criteria:

- UI code does not contain scattered raw Firestore query logic.
- Domain types support optional profile growth.
- Photo handling is represented by references only, not binary uploads.
- Data access always scopes records by `ownerId`.

## Phase 3: People MVP

Status: Not started

Tasks:

- [ ] Build People list page.
- [ ] Add search by `displayName`, `firstName`, `lastName`, and `nickname`.
- [ ] Add alphabetical sorting.
- [ ] Add group filter UI placeholder or initial implementation.
- [ ] Build Add Person flow.
- [ ] Keep creation form minimal: first name, last name, nickname, birthday, phone, email, groups.
- [ ] Redirect to person profile after creation.
- [ ] Build person profile route.
- [ ] Add profile sections for About, Important Dates, Notes, Relationships, Memories, Social Profiles, and Groups.
- [ ] Prefer compact empty sections with edit actions over large empty forms.
- [ ] Build Edit Person flow.
- [ ] Add archive or delete capability.

Acceptance criteria:

- User can create, view, edit, search, and archive/delete people.
- Person profile is useful even with sparse information.
- No direct photo upload exists.
- Profile design remains mobile-first and personal rather than CRM-like.

## Phase 4: Important Dates and Notes

Status: Not started

Tasks:

- [ ] Implement date model that supports full dates and dates without a year.
- [ ] Add important date CRUD.
- [ ] Add notes CRUD.
- [ ] Add pinned notes.
- [ ] Show important dates and pinned notes on person profile.
- [ ] Build date utilities for annual recurrence and next occurrence calculations.
- [ ] Build Upcoming page grouped by Today, This Week, This Month, and Later.
- [ ] Add tests for date utilities and upcoming calculations.

Acceptance criteria:

- Birthdays without known years work.
- Recurring annual dates calculate future occurrences correctly.
- Upcoming page displays useful relative timing.
- Notes remain lightweight and easy to add.

## Phase 5: Relationships

Status: Not started

Tasks:

- [ ] Implement relationship repository.
- [ ] Add relationship creation between two existing people.
- [ ] Add inverse relationship helper functions.
- [ ] Query relationships where a profile person appears as either side.
- [ ] Display relationship labels correctly from the current person's perspective.
- [ ] Add edit and delete relationship actions.
- [ ] Add tests for inverse relationship resolution.

Acceptance criteria:

- Relationships connect person records by ID, not names as text.
- Common inverse relationships display correctly.
- Person profile shows connected people with useful relationship context.

## Phase 6: Memories

Status: Not started

Tasks:

- [ ] Implement memory repository.
- [ ] Use `peopleIds: string[]` for MVP many-to-many memory association unless a stronger Firestore reason appears.
- [ ] Document Firestore query and index implications for `peopleIds`.
- [ ] Build Memories list page.
- [ ] Build Add Memory flow.
- [ ] Include title, start date, optional end date, associated people, location, description, tags, and photo integration placeholder.
- [ ] Add searchable multi-person selector.
- [ ] Build memory detail page.
- [ ] Show memories on associated person profiles.
- [ ] Show recent memories on Home.
- [ ] Add Google Photos service boundary and placeholder UI.

Acceptance criteria:

- User can create, view, edit, and delete memories.
- A memory can be associated with multiple people.
- Memory appears on each associated profile.
- Photos are reference-only and the system works without photos.

## Phase 7: Groups and Interactions

Status: Not started

Tasks:

- [ ] Implement groups repository.
- [ ] Provide suggested default group names without forcing them.
- [ ] Allow people to belong to multiple groups.
- [ ] Add group filtering to People.
- [ ] Implement basic interaction model and repository.
- [ ] Add optional lightweight interaction creation.
- [ ] Add last-interaction calculation if interaction data exists.
- [ ] Build Home "Worth Remembering" foundation using pinned notes and optionally older interactions.

Acceptance criteria:

- People can belong to multiple groups.
- Groups are user-owned and customizable.
- Interactions remain lightweight and clearly distinct from richer memories.

## Phase 8: Settings and Integration Boundaries

Status: Not started

Tasks:

- [ ] Build Settings page sections: Account, Google, Contacts, Photos, Calendar, Notifications, Privacy, Data.
- [ ] Show connected Google account details.
- [ ] Add Google Contacts service boundary.
- [ ] Add Google Photos service boundary.
- [ ] Represent integrations as Connected, Not connected, or Permission required.
- [ ] Do not request Contacts, Photos, or Calendar permissions during initial sign-in.

Acceptance criteria:

- Settings clearly communicates current and future integration states.
- No integration is presented as connected unless it actually is.
- Progressive permission architecture is prepared.

## Phase 9: Reminder Architecture and PWA Polish

Status: Not started

Tasks:

- [ ] Implement reminder model and repository.
- [ ] Add reminder presets to important dates where practical.
- [ ] Store reminder records with status.
- [ ] Defer push notifications unless the foundation is already stable.
- [ ] Improve installable PWA behavior.
- [ ] Add offline-friendly shell where sensible.

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

Start with Phase 0 and Phase 1:

1. Initialize the Next.js application with the agreed stack.
2. Configure Firebase, authentication, route protection, app shell, primary routes, PWA basics, domain types, repository foundations, and Firestore security rules.
3. Validate with lint, TypeScript checks, tests where present, and production build.

