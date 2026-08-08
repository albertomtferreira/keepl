You are starting implementation of a new PWA application: a private, person-centred relationship and memory manager.

The app is designed to help users remember friends, family, important dates, relationships, conversations, memories and useful personal details.

The product philosophy is:

“Help me remember the people and details that matter.”

This is not primarily a calendar and should not feel like a corporate CRM, although the underlying data model should be powerful enough to support CRM-like depth.

The PERSON is the central object in the application.

Important dates, memories, relationships, notes, interactions, social profiles and reminders should all connect back to people.

## 1. Technical stack

Use:

- Next.js using the App Router
- TypeScript with strict typing
- Tailwind CSS
- shadcn/ui
- Firebase Authentication
- Firestore
- Firebase Storage should NOT be used for personal photos
- React Hook Form
- Zod
- date-fns where date utilities are required
- Lucide icons
- PWA support
- Responsive/mobile-first UI

Use Google as the initial authentication provider.

Do not introduce additional backend frameworks.

Firebase should handle:

- Authentication
- Firestore database
- application user records

Do not use Firebase Storage for memory photos.

Photos will eventually be selected through Google Photos Picker and referenced rather than uploaded to our infrastructure.

## 2. General development principles

Build this as a production-quality application rather than a quick prototype.

Prioritise:

- clear architecture
- reusable components
- strict TypeScript
- separation between UI, data access and business logic
- Firestore security
- responsive mobile-first design
- accessibility
- clean loading states
- useful empty states
- error handling
- sensible validation

Avoid overengineering.

Do not implement speculative features until the core architecture requires them.

When functionality is not yet implemented, design interfaces/types so that future functionality can be added without major rewrites.

## 3. MVP scope

The initial MVP should support:

1. Google authentication
2. User onboarding
3. People
4. Person profiles
5. Important dates
6. Relationships between people
7. Notes
8. Memories
9. Multiple people attached to a memory
10. Google Photos references architecture
11. Upcoming dates
12. Basic reminders architecture
13. Search
14. Social profile links
15. Groups
16. PWA installation
17. Mobile-first responsive interface

Google Contacts and Google Photos API integrations should be prepared architecturally but do not need to be fully implemented until the core People/Memory system works.

## 4. Application navigation

Use five main areas:

Home

People

Memories

Upcoming

Add

On mobile, use a bottom navigation bar.

Suggested structure:

Home | People | + | Memories | Upcoming

The central Add button can open a sheet/dialog with options such as:

- Add Person
- Add Memory
- Add Note
- Add Important Date
- Add Interaction

Initially only expose actions that have been implemented.

On desktop/tablet, adapt the layout appropriately while retaining the same information architecture.

## 5. Authentication

Implement Google Sign-In using Firebase Authentication.

Unauthenticated routes should redirect to the login page where appropriate.

Create an application user document after first authentication.

Suggested Firestore structure:

users/{userId}

Fields:

- id
- email
- displayName
- photoURL
- createdAt
- updatedAt
- onboardingCompleted

Do not request Google Contacts, Photos or Calendar permissions during initial sign-in.

Additional Google permissions should be progressive and requested only when the corresponding feature is used.

## 6. Firestore ownership model

All relationship data must belong to a single authenticated user.

No public profiles.

No public discovery.

No shared relationship databases in the MVP.

Every major document must contain:

ownerId

Security rules must ensure users can only read/write documents where ownerId matches request.auth.uid.

Design this carefully from the beginning.

## 7. Person model

Create a Person entity.

People should require very little information.

Minimum:

- name

All other fields optional.

Suggested TypeScript model:

Person

- id
- ownerId
- firstName
- middleName?
- lastName?
- displayName
- nickname?
- photo?
- birthday?
- gender? [optional/freeform if included]
- phoneNumbers[]
- emails[]
- location?
- occupation?
- company?
- notesSummary?
- createdAt
- updatedAt
- archivedAt?
- source

PersonSource:

- manual
- google_contacts

Do not create dozens of required fields.

Profiles should grow naturally over time.

## 8. Person photo architecture

Do NOT implement direct image upload.

Create an abstraction for external images.

Suggested type:

PhotoReference

- id?
- source
- externalId?
- externalUrl?
- thumbnailUrl?
- cachedMetadata?
- caption?
- createdAt?

PhotoSource:

- google_photos
- google_contacts
- external

For V1, a person's photo may come from:

- Google account/contact data
- an external supported URL
- placeholder/avatar initials

Do not store actual personal photo binaries.

Do not assume Google Photos URLs are permanent.

Keep the implementation isolated behind a photo reference/service abstraction so the retrieval strategy can change later.

## 9. Person profile

Create a comprehensive person profile page.

Suggested sections:

Header:
- photo/avatar
- name
- nickname
- category/group
- quick actions

Quick actions may eventually support:
- call
- WhatsApp
- email
- Instagram
- Facebook

Profile sections:

About

Relationships

Important Dates

Things to Remember

Memories

Interactions

Social Profiles

Groups

The interface should not display large empty forms.

Prefer compact cards/sections with edit buttons.

Example:

Ricardo Silva

Birthday
24 November

Partner
Maria Silva

Things to remember
- Loves Islay whisky
- Wants to visit Iceland
- Ask about new job

Upcoming
Birthday in 108 days

Recent memories
Porto Weekend
03 Aug 2026

## 10. Relationships between people

Relationships must be first-class Firestore records.

Do not store spouse/child names as plain text on Person.

Create:

relationships/{relationshipId}

Suggested fields:

- id
- ownerId
- personAId
- personBId
- type
- inverseType?
- label?
- startedAt?
- endedAt?
- notes?
- createdAt
- updatedAt

Relationship types should initially include:

- partner
- spouse
- parent
- child
- sibling
- friend
- colleague
- relative
- housemate
- introduced_by
- custom

The application must understand common inverse relationships.

Examples:

parent -> child

child -> parent

partner -> partner

spouse -> spouse

sibling -> sibling

friend -> friend

colleague -> colleague

When displaying a profile, query relationships where that person appears as either personAId or personBId.

Create helper functions that resolve the other person and the displayed relationship type.

Design this cleanly because relationship graph functionality may be added later.

## 11. Important dates

Create an ImportantDate entity.

Collection:

importantDates

Suggested fields:

- id
- ownerId
- personId
- title
- type
- date
- hasYear
- recurring
- recurrenceType?
- notes?
- reminderPreset?
- createdAt
- updatedAt

Types:

- birthday
- anniversary
- wedding
- met
- graduation
- new_job
- moved_house
- retirement
- bereavement
- custom

Important:

Some meaningful dates will not have a known year.

Support dates such as:

“Birthday: 18 March”

without requiring a birth year.

Dates may also be recurring or one-off.

The Upcoming page should calculate future occurrences correctly.

## 12. Notes / things to remember

Create lightweight PersonNote records rather than putting all notes into one text field.

Collection:

personNotes

Fields:

- id
- ownerId
- personId
- text
- pinned
- completed?
- reminderAt?
- createdAt
- updatedAt

Examples:

- Ask how the job interview went
- Wants to visit Iceland
- Daughter starts university in September
- Favourite whisky is Lagavulin

Pinned notes should be easy to surface on a person's profile.

Keep this intentionally lightweight.

## 13. Memories

Memories are first-class objects and can involve multiple people.

Collection:

memories

Fields:

- id
- ownerId
- title
- description?
- startDate
- endDate?
- location?
- tags[]
- photoReferences[]
- createdAt
- updatedAt

Do not put person IDs directly into a giant nested structure if this creates long-term querying problems.

Choose a clean Firestore-friendly solution for many-to-many relationships.

A reasonable MVP option is:

peopleIds: string[]

inside the memory record.

If using this approach, document the Firestore query/index implications.

A memory should appear on the profile of every associated person.

Example:

Porto Weekend

3–5 August 2026

People:
Ricardo
Pedro
João

Location:
Porto

Photos:
Google Photos references

Notes:
Weekend away together.

## 14. Memory creation flow

Create a mobile-friendly Add Memory flow.

Fields:

- title
- date/start date
- optional end date
- associated people
- optional location
- description
- tags
- photos placeholder/integration point

The person selector must support searching existing People.

Allow multiple selections.

On successful save:

- create memory
- associate selected people
- redirect to memory detail page or previous context
- show success feedback

## 15. Google Photos architecture

Do NOT implement local photo uploading.

The long-term flow will be:

Add Memory
→ Select from Google Photos
→ Google Photos Picker
→ user selects media
→ app stores references/metadata

For now:

Create an integration boundary/service module for Google Photos.

Do not fake permanent Google Photos URLs.

If API credentials/scopes are not configured, implement a clearly labelled UI placeholder:

“Select from Google Photos”

and leave the integration behind a service interface.

The rest of the memory system must work without photos.

## 16. Social profiles

Create social profile records associated with people.

Collection or embedded structure may be used depending on Firestore design.

Suggested fields:

- platform
- username?
- profileUrl
- createdAt

Supported platform values:

- instagram
- facebook
- linkedin
- whatsapp
- tiktok
- x
- other

For Facebook and Instagram, assume profile linking only.

Do NOT build scraping.

Do NOT assume access to friends lists or external profile data.

Clicking a social profile should open the appropriate external profile/application.

## 17. Groups

Allow people to belong to multiple groups.

Examples:

- Family
- Inner Circle
- Close Friends
- Friends
- Work
- Portugal
- Football
- Neighbours

Do not force a single category.

Suggested collections:

groups

- id
- ownerId
- name
- description?
- createdAt
- updatedAt

Person records can initially contain:

groupIds: string[]

unless a separate join structure becomes technically preferable.

Provide default suggested groups but allow custom groups.

## 18. Interactions

Prepare the architecture and optionally implement a basic version.

Interaction:

- id
- ownerId
- peopleIds[]
- type
- date
- title?
- notes?
- createdAt
- updatedAt

Types:

- met
- phone_call
- video_call
- message
- dinner
- coffee
- trip
- event
- other

Interactions differ from Memories.

An Interaction can be a lightweight contact record.

A Memory is a richer meaningful event.

Do not overcomplicate the distinction in the UI yet.

## 19. Home dashboard

Create a useful Home dashboard.

Initial sections:

Coming Up

Show upcoming important dates.

Example:

Ricardo's Birthday
12 days

Maria & João Anniversary
18 days

Worth Remembering

Initially this can show pinned notes and/or people with old interactions if interaction logic exists.

Recent Memories

Display recent memory cards.

People

Optionally show recently viewed/created people.

Avoid analytics-heavy CRM language.

Do not display relationship health scores.

Tone should feel personal rather than corporate.

## 20. Upcoming screen

Create an Upcoming page.

Group important dates by time period:

Today

This Week

This Month

Later

Each entry should display:

- person avatar
- person name
- event title/type
- date
- relative timing

Example:

Ricardo
Birthday
24 November
In 12 days

Clicking should open either the important date or person profile.

## 21. People list

Create a responsive People screen.

Features:

- search
- sort alphabetically
- avatar
- name
- optional short context
- group filtering
- add person

Search should initially match:

- displayName
- firstName
- lastName
- nickname

Design the search abstraction so future semantic/intelligent search can be added later.

## 22. Person creation

Create a simple Add Person flow.

Initial form:

- First name
- Last name
- Nickname
- Birthday
- Phone
- Email
- Group(s)

Do NOT present every possible Person property during creation.

After creation, redirect to the Person profile where additional information can be added gradually.

## 23. Google Contacts integration preparation

Google Contacts import is important but should follow core People functionality.

Prepare a module/service boundary such as:

services/google/contacts

Expected future workflow:

Settings / People
→ Import Google Contacts
→ request permission
→ fetch contacts
→ select contacts
→ import selected contacts

Do NOT automatically import an entire Google address book.

Users must explicitly choose contacts.

Map imported contacts into Person records.

The architecture should track:

source = google_contacts

and, where appropriate:

externalContactId

to support future synchronisation/deduplication.

Do not block initial application development on this integration.

## 24. Reminder architecture

Do not initially build a complex scheduling engine.

Create a Reminder data model suitable for future push notifications.

Suggested:

Reminder

- id
- ownerId
- personId?
- importantDateId?
- noteId?
- memoryId?
- triggerAt
- recurrence?
- status
- createdAt
- updatedAt

Status:

- scheduled
- completed
- dismissed
- cancelled

For birthdays/important dates, allow simple reminder presets in the UI where practical:

- on the day
- 1 day before
- 3 days before
- 7 days before
- 14 days before
- 30 days before

Implementation of actual web push notifications can be a later milestone if it would slow the initial core substantially.

## 25. PWA

Configure the application as an installable Progressive Web App.

Include:

- web manifest
- appropriate icons/placeholders
- theme metadata
- standalone display
- mobile-friendly viewport
- offline-friendly shell where sensible

Do not attempt complex full offline Firestore synchronisation beyond capabilities Firebase already provides unless required.

The main target experience is Android Chrome installed as a PWA.

However, do not intentionally break desktop or iOS browser support.

## 26. Settings / integrations

Create a Settings page.

Sections should eventually include:

Account

Google

Contacts

Photos

Calendar

Notifications

Privacy

Data

For now Google sign-in should show connected account details.

Future integrations should have clearly separated states:

Connected

Not connected

Permission required

Do not pretend integrations are connected when they are not.

## 27. Privacy principles

This application will store personal details about people who may not themselves use the application.

Treat privacy as a foundational requirement.

Implement:

- strict owner isolation
- no public routes exposing personal data
- no anonymous Firestore access
- appropriate Firestore rules
- delete capabilities for user-created data
- timestamps/audit-friendly metadata

Do not introduce advertisements, social discovery or public profile concepts.

## 28. Firestore architecture

Before writing lots of UI code, define the Firestore collections and TypeScript domain models.

Suggested top-level collections:

users

people

relationships

importantDates

personNotes

memories

interactions

groups

reminders

You may adjust this structure if there is a clear Firestore-specific reason.

However:

- keep ownership explicit
- avoid deeply nested structures that make querying difficult
- avoid duplicating mutable person data unnecessarily
- use references/IDs rather than copying complete Person objects into memories and relationships
- document required composite indexes

Create Firestore converters or equivalent typed data-access helpers.

UI components should not contain raw Firestore query logic everywhere.

Create repositories/services such as:

peopleRepository

relationshipsRepository

memoriesRepository

importantDatesRepository

notesRepository

groupsRepository

## 29. Suggested source structure

Use a clean folder structure similar to:

src/
  app/
    (auth)/
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

  services/
    google/
      contacts/
      photos/

  repositories/

  types/

Use judgement rather than following this rigidly if a better modern Next.js structure emerges.

## 30. UI direction

The UI should be:

- clean
- warm
- modern
- personal
- uncluttered
- mobile-first

Avoid corporate CRM visuals.

Avoid excessive tables on mobile.

Use:

- cards
- avatars
- timeline elements
- chips/tags
- bottom sheets/dialogs
- compact contextual menus

Person profiles should feel more like a personal profile/timeline than an admin record.

Do not create a visually childish application.

Aim for a mature personal productivity product.

## 31. Empty states

Create useful empty states.

Examples:

People:

“No people yet.

Add the people you want to remember better.”

Memories:

“Your memories will appear here.

Record trips, dinners and moments involving the people that matter.”

Upcoming:

“Nothing coming up.

Important dates you add to people will appear here.”

Empty states should explain value rather than merely stating that data does not exist.

## 32. Date handling

Dates are important to this product.

Create reusable date utilities.

Handle:

- date without year
- full date
- recurring annual date
- past dates
- future occurrences
- relative display such as “in 12 days”
- birthday occurrence calculation

Avoid timezone bugs.

Store timestamps consistently.

Do not assume every important date includes a year.

## 33. Seed/demo data

Provide optional development seed data so that the UI can be tested immediately.

Example fictional people:

Ricardo Silva
Maria Silva
Pedro Fernandes
João Costa
Sofia Silva

Create example:

- relationships
- birthdays
- notes
- memory
- groups

Example memory:

Porto Weekend
3–5 August 2026
Ricardo, Pedro and João

Do not automatically seed production user accounts.

## 34. Testing

Add tests around business logic where valuable, particularly:

- date calculations
- inverse relationship resolution
- upcoming-date calculations
- validation
- ownership-sensitive repository logic where feasible

Do not spend disproportionate effort snapshot-testing visual components.

## 35. Development milestones

Work incrementally.

### Milestone 1 — Foundation

- initialise Next.js project
- TypeScript
- Tailwind
- shadcn/ui
- Firebase configuration
- environment handling
- Google authentication
- authenticated application shell
- mobile navigation
- PWA manifest

### Milestone 2 — People

- domain model
- Firestore repository
- People list
- Add Person
- Person profile
- edit person
- delete/archive person
- search

### Milestone 3 — Important Dates + Notes

- important date CRUD
- notes CRUD
- profile integration
- Upcoming screen
- recurring date calculations

### Milestone 4 — Relationships

- relationship data model
- relationship CRUD
- inverse relationship handling
- person profile relationship section
- selecting an existing person to connect

### Milestone 5 — Memories

- memory CRUD
- multiple people association
- memory detail
- person timeline integration
- recent memories
- Google Photos integration boundary

### Milestone 6 — Groups + Interactions

- groups
- person group membership
- interaction records
- last interaction calculations
- Home “Worth Remembering” foundations

### Milestone 7 — Google integrations

- Google Contacts import
- Google Photos Picker
- permission flows
- external reference handling

### Milestone 8 — Notifications

- reminder records
- PWA push notifications where practical
- reminder settings

Do not jump ahead to AI features yet.

## 36. Future capabilities to protect architecturally

Do NOT implement these now, but avoid architectural decisions that would make them difficult later:

- AI natural-language data entry
- AI extraction of people/dates/events from notes
- natural-language search
- relationship graph visualisation
- smart reminders
- semantic memory search
- Google Calendar integration
- contact synchronisation
- Facebook/Instagram enhanced APIs
- iCloud/other photo providers
- multi-user/shared memories
- export/import
- encrypted private fields

## 37. Important product rules

Remember these throughout development:

1. Person first, calendar second.

2. Almost every Person field should be optional.

3. Profiles should become richer naturally over time.

4. Memories can involve multiple people.

5. Relationships connect Person records rather than storing names as text.

6. Do not upload personal photos to our infrastructure.

7. Google Photos should eventually provide photo selection.

8. Social media integration should initially be profile linking, not scraping.

9. Do not automatically import someone's entire Google Contacts list.

10. The user must explicitly select people they want in the application.

11. Avoid friendship scores and gamification.

12. Use relationship information to provide useful context, not to judge relationships.

13. Privacy and owner isolation are mandatory.

14. Do not require Google integration beyond authentication for the basic application to work.

15. Build the data model for future intelligence, but keep the initial experience simple.

## 38. First implementation task

Start by inspecting the existing repository.

If the repository is empty, initialise the application with the agreed stack.

If code already exists:

- inspect the current architecture
- preserve useful existing conventions
- avoid unnecessarily replacing working code
- identify any conflicting architecture before proceeding

Then implement **Milestone 1 and the foundations required for Milestone 2**.

Specifically deliver:

- Next.js application structure
- Firebase configuration
- environment variable example
- Google authentication
- authenticated route protection
- user document creation
- responsive app shell
- mobile bottom navigation
- Home placeholder
- People route
- Memories route
- Upcoming route
- Settings route
- domain TypeScript types
- Firestore repository pattern
- initial Person schema
- Firestore security rules
- PWA manifest/configuration

After the foundation is stable, implement:

- People list
- Add Person
- Person detail/profile
- Edit Person
- Archive/delete Person
- People search

Before making major architecture decisions, inspect the repository and reason from the actual codebase.

Do not simply generate a large number of files without validating the application.

Run:

- lint
- TypeScript checks
- relevant tests
- production build

Fix errors before considering the milestone complete.

At the end, provide a concise implementation summary containing:

- what was implemented
- key architecture decisions
- Firestore collections created
- environment variables required
- Firebase Console configuration required
- known limitations
- recommended next milestone

Begin implementation now.