# Background inquiry delivery

Worker infrastructure deployed to staging September 10, 2026; see qa/background-email-gcp-2026-09-10.md. Public customer enqueue remains disabled.

When BARSYS_BACKGROUND_EMAIL_ENABLED=1 on a LIVE server, new wizard inquiries and two notification jobs commit atomically. Local/staging submissions never enqueue. Existing inquiries are not backfilled. Repeated submission keys do not create duplicate jobs.

Run scripts/run-notifications.mjs as a scheduled Cloud Run job with DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and BARSYS_GMAIL_REFRESH_TOKEN supplied from secret bindings. The same enable flag must be explicitly set on the job. Never paste credentials into chat or repository files. Worker checks sender identity before claiming jobs. Offline credentials are now held in Secret Manager and bound to the Cloud Run job; they are intentionally absent from local environment files.

Each worker handles at most 20 jobs. Database claims prevent concurrent claims of the same job. Accepted sends stay complete. Explicit rate-limit rejection backs off, maximum five attempts. Network errors, ambiguous responses and interrupted leases require review of Sent mail; they are not automatically retried. Message-ID assists investigation but is not a Gmail deduplication guarantee. Manual resolution/retry UI remains to be built.

Owner-only GET /api/admin/notifications reports recent delivery status without message contents. Worker emits notification_worker / notification_worker_unavailable structured logs and exits nonzero for recent failed/unknown jobs. An ERROR-log Cloud Monitoring alert to fareed@barsys.com is active and its inbox delivery was tested. Backlog and missing-run detection remain pending. Configure Cloud Monitoring for failed executions, queue backlog and worker error logs, using fareed@barsys.com; verify the destination and send a test alert. Monitor through Cloud Monitoring independently of Gmail transport.

Activation sequence:
1. Configure server-side OAuth offline authorization with state validation, exact registered callback and private secret storage; acquire the sender refresh credential via Google consent. Current interactive browser grant is not an offline credential. This setup remains pending.
2. Exercise real PostgreSQL queue claims and transaction rollback in staging with synthetic-only recipients. Current integration tests use SQLite.
3. Deploy a disabled worker and create a paused scheduler; confirm secrets, IAM and log redaction. Review current OAuth testing/audience restrictions before unattended operation.
4. Enable a controlled self-send, verify inbox receipt, worker retry/error handling and external monitoring alert.
5. Enable LIVE enqueue and schedule only after those checks. No historical backfill or customer sends in this implementation batch.

References: https://developers.google.com/identity/protocols/oauth2/web-server and https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule
