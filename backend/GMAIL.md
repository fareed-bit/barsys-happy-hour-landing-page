# Keyword matching update

Email inquiries now match the Happy Hours Inquiries label OR any saved keyword phrase. Default phrases: happy hours, happy hour, Barsys event, cocktail catering, corporate event, office party, cocktail experience, mixology event, event proposal. Edit **Keywords to track** and save; settings persist privately across sessions with version checks. Empty keywords means label only. No Gmail label is required for keyword matches.

Queries search available history and exclude Sent, Drafts, Spam and Trash. Gmail handles phrase matching; broad phrases can include unrelated messages. Incoming replies only import when they match the current query. No guarantee that all event correspondence will match. Prior imported messages stay in the queue when keywords change. Existing thread-level event deduplication remains.

112 tests pass, including safe literal query construction and durable settings concurrency. Historical label-only notes below are superseded where applicable. Read-only permission, manual event review and page-open-only polling remain unchanged.

# Gmail inquiry review

Open /admin/email.html from the inquiry desk or operations header. Connect fareed@barsys.com and authorize Gmail read-only. Apply the exact Gmail label **Happy Hours Inquiries** in Gmail to select messages for import. The app never sends, deletes, archives, changes labels or marks mail read.

Google grants mailbox-wide read permission; label selection is application filtering, not a restricted Google grant. The Gmail API was enabled in happy-hour-landing-version-2. Existing Google client is used through GIS token authorization; no client secret or refresh token stored. Authorization is memory-only and disappears at reload/close. Automatic checks are opt-in every five minutes while the page is visible, open and authorization remains valid. There is no unattended/background importer.

Server validates token audience, readonly scope and exact mailbox before reading. Admin owner authorization and same-origin checks apply independently. Imported plain text (up to 20,000 characters), sender, subject and conservative suggestions persist in a private email_inquiries table. HTML is never rendered, remote images/attachments never fetched, and email text never executed as instructions. Dates require explicit ISO format; package and unsupported facts require manual entry. Forwarded sender identity must be reviewed. Suggestions are deterministic, not a general language-model extraction service.

Review and confirm required event fields before creating. Unique source-thread key makes retries and multiple messages in one thread return the existing event. Existing event details are not automatically updated from replies. No booking, contract consent or payment is inferred. Imported queue currently retains all messages; archive/delete and retention controls are future additions.

Validation: 110 tests pass with bundled Node 24 and --test-concurrency=1. Browser verified synthetic local review/create/retry and 390px layout. Real Google consent and first real import are pending owner action. Staging gmail-0909 serves 100%, image sha256:14cc9c7ebe82e0363ed55857a67d80a816fbcb37aa780b1299a56927b781d6e6; build f4ceaedc-4764-4a1f-af5c-d8bfa55ea71a. Existing DB secret v2 unchanged. No customer messages or real events created.
