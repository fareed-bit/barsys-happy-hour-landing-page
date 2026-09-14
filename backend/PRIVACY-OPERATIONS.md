# Coordinated privacy operations and recovery archive

Companion to [PRIVACY-REQUEST-RUNBOOK.md](PRIVACY-REQUEST-RUNBOOK.md) and [RETENTION-OPERATIONS.md](RETENTION-OPERATIONS.md).

## Coordinated copy review (September 10 operating review)
Fareed is the case owner. Keep the case record in restricted operations storage outside the website, deployment package and public QA artifacts. Use a case ID, record IDs, dates, scope, owner and outcomes; do not copy message bodies or sensitive notes into the case log. The following copy map is mandatory before closing any request:

| Copy | Review/action | Completion evidence |
|---|---|---|
| Inquiry, proposal, preparation, event operations | Review links and holds in Event desk / Records and health; use only the eligible owner control | Record ID, action date and minimal ledger entry |
| Gmail source and sent conversations | Check message/thread links and active agreements; preserve required records; handle any permitted change separately in Gmail | Message IDs and retained/changed decision, no copied body |
| Imported dashboard email copy | Linked cases remain blocked; unlinked copies may use the 90-day reviewed removal control | Message ID and removal ledger entry |
| Proposal PDFs, summary exports, attachments, clipboard/download copies | Locate copies controlled by Barsys, review third-party data and record retained/removed/unlocated status | Locations or custodians and outcome; no assertion of erasure of unknown copies |
| Shared staff, inventory and accounting | Preserve shared operational records; inspect free-text fields for unnecessarily copied client details | Minimal correction/retention decision |
| Logs and monitoring | Application error logging was reviewed: structured path/type, no request body. Platform request logs remain separate | Review relevant IDs/URLs only; never put contact details in query strings |
| Backups and removal ledger | Snapshots expire separately; archive each new ledger and reconcile isolated restores before reopening traffic | Verified archive URI/checksum and restore result |

An email-linked event that is ineligible for automated retirement is a supported manual exception, not an instruction to bypass the server. Keep its hold/review open, map the linked source/thread, identify required agreements/accounting records, and document the retention basis and next review date. Do not relabel a Gmail event as a wizard inquiry, remove links to force eligibility, or promise completed deletion. Engineering must prepare a separately reviewed migration if that case requires coordinated deletion that the current controls cannot perform.

For access/correction, verify through the existing contact channel, assemble only the requested person's records, inspect third-party information, and record the requested correction and affected copies. Sending the response remains a separate authorized action. For any unresolved copy, record an explicit exception and next review date rather than marking the case fully erased.

## Independent ledger archive
The private bucket `gs://happy-hour-landing-version-2-privacy-ledgers` is separate from Cloud SQL backups. Uniform bucket-level access, public-access prevention and object versioning are enabled. Existing project IAM administrators retain their project privileges; this is not an owner-exclusive security boundary. It has no public grants and no automatic expiry/retention lock. Review access and continued need with backup/disposal review; do not delete ledgers that may be needed to reconcile retained backups. This storage is billable, based on usage.

After EVERY removal/retirement, and before any database restore:
1. Download the latest removal ledger from the owner Records and health page to a private location. This is pseudonymous operational data, not a public QA report.
2. Run `node scripts/archive-disposal-ledger.mjs /absolute/private/path/ledger.json archive` from the project. The tool validates the schema, writes a new timestamped object, downloads it again and verifies SHA-256. It prints counts/URI/checksum only and clears temporary files. Use `verify-synthetic` only for drills; those files go into a separate verification prefix and must never be used as a real restore ledger.
3. Record the verified URI/checksum in the restricted case record. If upload or verification fails, mark archive pending, retry, and do not declare the case/recovery ready. Preserve the downloaded copy securely until verification succeeds.
4. For a restore, retrieve the newest VERIFIED real ledger; validate its counts/freshness against the case log. Apply the existing isolated reconciliation tool before serving traffic. Reject synthetic verification objects. Inspect conflicts, delivery quarantine, stale sessions and any outside-copy exceptions before release.

This is a manual operator workflow; no automated ledger export, scheduled purge, mailbox deletion, or case-response email is enabled. The September 10 drill uploaded and retrieved a synthetic ledger successfully with an identical checksum; no real records were removed.
