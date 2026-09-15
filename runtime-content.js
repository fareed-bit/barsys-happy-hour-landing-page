/* Describes actual runtime behavior; does not approve legal or retention terms. */
(() => {
  'use strict';
  const runtime = window.BARSYS_RUNTIME;
  const policies = window.BARSYS_POLICIES;
  if (!policies || !runtime || !['LOCAL_TEST','STAGING_TEST','LIVE'].includes(runtime.mode)) return;
  const label = {LOCAL_TEST:'LOCAL BACKEND',STAGING_TEST:'PRIVATE STAGING',LIVE:'CONNECTED EVENT SERVICE'}[runtime.mode];
  const test = runtime.mode !== 'LIVE';
  const action = test ? 'Save test inquiry' : 'Send inquiry';
  const destination = runtime.mode === 'LOCAL_TEST' ? 'the local server\'s event database' : 'the hosted event database';
  const context = test
    ? `${label}. Only ${action} stores the inquiry in ${destination}. Use synthetic details for testing. A saved inquiry does not hold a date, sign an agreement or take payment.`
    : 'Send inquiry shares your plan and contact details with the Barsys team. An inquiry does not hold a date, sign an agreement or take payment.';
  policies.privacy = {
    title:'Privacy notice', tag:label + ' / TECHNICAL DATA-HANDLING NOTICE', body:`
    <p class="policy-lead">${context}</p>
    <h3>Who handles your information</h3><p>Barsys Inc., 44 W 37th St, New York, NY 10018 operates this event service. Contact <a href="mailto:fareed@barsys.com">fareed@barsys.com</a> for privacy questions, access, corrections or deletion requests.</p>
    <h3>Planning and explicit submission</h3><p>The wizard holds your plan in browser memory until you explicitly save or send it. That action transmits contact information, event requirements, optional notes and your separate permission preferences to the event server. The record persists in its database and can be reviewed by the authorized Barsys owner. Assigned active crew can access a restricted operational view of their events, not the owner financial dashboard.</p>
    <p>Creating or downloading a planning preview is not a submission. The save receipt confirms storage, not an email delivery, booking, agreement signature, payment or marketing subscription. Errors leave the open plan available for retry.</p>
    <h3>Browser storage and staff sign-in</h3><p>Optional remembered selections are independent from server records. Enabling Remember event selections saves non-contact preferences for up to 30 days; contact fields, dates, addresses, budget, free text and permission choices are excluded. Turning it off clears the browser draft only, not an inquiry already saved on the server. Staff Google sign-in uses a short-lived challenge cookie and an eight-hour session cookie. See Cookies &amp; browser storage for the inventory.</p>
    <h3>Owner-authorized Gmail review</h3><p>The separate owner email workspace can request read-only Gmail authorization. Matching messages are imported only through that workflow; the public wizard does not read your mailbox. Imported sender, subject, bounded plain text and review suggestions are stored privately. Creating an event requires review. The read-only import does not send, delete, archive, relabel or mark Gmail messages as read. A separate owner-authorized Gmail sender supports inquiry receipts and internal notifications when delivery is enabled; importing email does not authorize a reply. Gmail authorization is held in memory; optional polling runs only while the page is open, visible and authorized.</p>
    <h3>Retention, copies and contact</h3><p>Our retention policy is 12 months for unconverted inquiries and 90 days for imported email review copies, with exceptions for active events and required records. Core completed-event records, including agreements, invoices, payments and supporting expenses, are reviewed after seven years from the later of financial closeout or the relevant tax return filing/due date. Audits, disputes, insurance claims and other required-retention holds may extend these periods. Review dates and holds are tracked in the dashboard; deletion is not automatic and expired records require an owner review. No automatic retention or deletion schedule is currently running. Browser clearing and logout do not delete server records or existing backups. Contact fareed@barsys.com to discuss access, corrections or deletion; processing and any required retention need review rather than an automatic promise. Exported files and clipboard copies must be managed separately. Do not enter card details, identity documents or named guests' medical information.</p>
    <h3>Media and external services</h3><p>Company artwork and event films are normal page content, independent from draft-storage preferences. Local files are preferred; configured Barsys image-host fallbacks may make ordinary image requests. Hosted mode uses Google Cloud Run for the application, Cloud SQL for event records and backups, restricted Cloud Storage for removal-ledger recovery archives, Secret Manager for credentials, and Cloud Logging/Monitoring for operational logs and alerts. Google Workspace/Gmail provides separately authorized email import and delivery; Google sign-in verifies staff identity. These services process data needed to host, secure and operate the event service. Local test mode uses a local database instead of Cloud SQL. No analytics, advertising pixel, session replay or third-party event-video player is installed. Server access/error logs and hosting controls are separate from browser draft storage.</p>
    <p>This describes the implemented connected mode, not a legal-compliance certification. Requests to access, correct or remove information are reviewed after verifying the requester. Records needed for an active event or a legal/financial obligation may need to be retained. Backup copies follow the hosting backup lifecycle and are not erased by clearing browser storage.</p>`
  };
  const prefix = runtime.secure ? '__Host-' : '';
  policies.cookies = {
    title:'Cookies & browser storage', tag:label + ' / IMPLEMENTED STORAGE', body:`
    <p class="policy-lead">Connected mode uses staff authentication cookies. Optional planner storage is separate; no analytics or advertising tags are installed.</p>
    <div class="policy-table-wrap"><table><thead><tr><th>Item</th><th>Purpose</th><th>Lifetime</th></tr></thead><tbody>
    <tr><td>${prefix}barsys_challenge</td><td>One-use staff sign-in challenge; HttpOnly, SameSite=Strict.</td><td>5 minutes, consumed on successful sign-in</td></tr>
    <tr><td>${prefix}barsys_session</td><td>Authenticated staff session; HttpOnly, SameSite=Strict${runtime.secure ? ', Secure' : ''}. Logout revokes the session.</td><td>Up to 8 hours</td></tr>
    <tr><td>barsys-privacy-v38</td><td>Explicit browser preference choice, without contact fields.</td><td>Up to 180 days</td></tr>
    <tr><td>barsys-local-draft-v38</td><td>Opt-in non-contact planner selections.</td><td>Up to 30 days</td></tr>
    <tr><td>barsys-v2-motion</td><td>Explicit motion preference.</td><td>Until cleared</td></tr>
    </tbody></table></div>
    <p>Expiry cleanup occurs when the application next checks entries; it does not run after a browser tab is closed. Google sign-in/authorization pages manage their own storage outside these planner controls.</p>
    <p>Use <button class="policy-inline" type="button" data-open-privacy>Privacy preferences</button> to manage optional local draft storage. This does not erase server inquiries, imported emails, authentication cookies, backups or exported files. Use staff sign out to revoke a staff session.</p>
    <p>Server records follow the retention periods in the Privacy notice. Deletion is an owner-reviewed step, not an automatic schedule.</p>`
  };
  policies.terms = {...policies.terms, body:policies.terms.body.replace('Sending an inquiry through this website does not create a booking.', `This connected service stores an inquiry only after ${action}. It does not create a booking.`)};
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.appMode = runtime.mode;
  const tag = document.querySelector('#privacy-dialog .policy-tag');
  if (tag) tag.textContent = label + ' / OPTIONAL BROWSER STORAGE';
  const host = document.getElementById('proposal');
  if (host && !document.getElementById('runtime-data-notice')) {
    const note = document.createElement('p'); note.id='runtime-data-notice';
    note.className='review-info'; note.setAttribute('role','note'); note.textContent=context;
    const anchor = host.querySelector('.route-switch');
    if (anchor) anchor.before(note); else host.prepend(note);
  }
})();
