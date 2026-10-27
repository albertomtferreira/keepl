# In-app date reminders

Home and Upcoming display a reminder section for active people's birthdays and important dates according to the device's account-scoped Settings schedule. Each date category has two configurable reminders, with offsets of 0, 1, 3 or 7 calendar days and independent local times. By default, the event-day reminder is enabled at 08:00; the second reminder starts disabled with a seven-day offset. Imported Google birthdays are included. The section is hidden when nothing is due, and all due items are shown even though Home's general Coming Up preview is limited to three items.

Dates use the device's local calendar day, including daylight-saving changes. The day updates at midnight and when returning to the app. Existing saved reminder records and their scheduling controls remain unchanged.

These are reminders inside the open app. There is no push, email, background delivery or unread-notification history. No new records, portable fields, permissions or database rules are introduced. Reminders are derived from existing owner-scoped records and disappear when their source is deleted or archived.

The UI is localized in English, Portuguese, French and Spanish. Settings describes the in-app capability separately from push/email delivery. Smart reminder suggestions and background notification infrastructure remain deferred under R3/FT 6.
