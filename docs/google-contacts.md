# Google Contacts personal trial

FT 8 currently supports selected imports and manually reviewed, one-way updates. Open **Settings → Google Contacts → Manage contacts**.

## Google and Firebase setup

1. Enable **Google People API** in the Google Cloud project used by Firebase Google sign-in.
2. Configure the OAuth consent screen for `https://www.googleapis.com/auth/contacts.readonly`. If the app is in testing, include your Google account as a test user. Complete any consent configuration Google requires for your intended audience.
3. Keep the app origin in Firebase Authentication's authorized domains and the existing Google sign-in configuration working. Contacts uses the same linked Google account through explicit Firebase reauthentication; it does not add Contacts permission to initial sign-in.
4. Deploy the updated `firestore.rules` to the intended Firebase project before using Contacts against the live database. The new `googleContactLinks` rules are needed for atomic link claims. No composite index or server secret is required. No deployment was performed as part of local implementation.

## Import and refresh

Connect, then browse contacts. Pages contain up to 100 contacts; search covers loaded pages. Choose **Create a new person** or link to an existing person. Possible matches use names, normalized email addresses and phone numbers; review identity yourself. Existing people already linked to another Google contact are excluded from destinations.

Choose **Review selected contacts**, inspect the values, and confirm each person. New imports select the supported fields by default. Updates to existing people start with every field unchecked. Confirming an existing person also creates its Google link even if you leave all fields unchanged.

Use **Review updates** on a linked person, or review updates for all linked active people. Select the changed fields to accept. Checking a field whose Google value is empty explicitly removes that Keepl value. Every confirmation is one atomic transaction. Earlier confirmations remain saved if a later operation fails; reload contacts and review again after an error. Repeated new imports reuse the same destination ID.

Local disconnect preserves people and links. Credentials expire after at most 50 minutes and are not retained across reloads. Reconnect to the same Google account to refresh saved links. Revoking Google access can also revoke other permissions granted to Keepl, including Photos.

Backups preserve safe account/contact references, not credentials or operational uniqueness claims. Restore remains preview-first with current-owner reassignment. Restoring duplicate people with the same Google reference does not merge them automatically; resolve those copies before refreshing them.

## Verification still required with your account

- Consent granted, denied, popup cancelled/blocked, and People API disabled.
- Select multiple contacts; leave others unselected; review a possible duplicate before linking it.
- Import a yearless birthday, multiple email addresses and phone numbers; retry after a network interruption.
- Edit both a Keepl field and its Google counterpart; confirm only selected updates. Delete a Google contact and verify Keepl retains its person.
- Reload, expire credentials, sign out, switch Keepl accounts, disconnect and revoke/reconnect. No previous owner's contact preview or credential should remain usable.
- Export, preview and restore linked people; reconnect explicitly and check reference/account matching.

Local mocked-provider browser tests establish the app flow, not real Google consent configuration or live API behavior. Background refresh, automatic conflict resolution and two-way Google writes are outside this trial.
