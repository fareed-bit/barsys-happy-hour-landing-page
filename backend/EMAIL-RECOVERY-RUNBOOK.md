# Inquiry email incident recovery

Owner: fareed@barsys.com. Records and health shows up to 100 jobs, failed/unknown first; aggregate health covers the entire queue.

- Pending: inspect due time, scheduled worker execution and last successful heartbeat. Do not resubmit the inquiry to trigger another message.
- Sending/unknown: compare inquiry/job identifiers, recipient, subject and timing with Gmail Sent. Provider acceptance may have occurred before a worker crash. Never blindly retry.
- Failed: inspect the safe result and worker error, repair the sender configuration if needed, then check Sent before any recovery.
- Accepted: Gmail accepted the message; this does not prove receipt, opening or absence of a bounce. Review any bounce through Gmail separately.

For a manual replacement, first establish that no matching send occurred, document the incident and obtain the necessary authorization for that exact recipient/message. Record the resulting Gmail reference and resolution. The dashboard has no automatic retry/resolve button; editing queue rows directly is not the recovery procedure. Do not reset an unknown job to pending.

During an incident check readiness, database access, Cloud Run worker, Scheduler, independent health job and its absence alert. Existing failure/unknown jobs continue to flag attention until a reviewed resolution mechanism is implemented. This is a known operational limitation, not a completed retry workflow.
