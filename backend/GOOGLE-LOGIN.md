# Google staff access — implemented 2026-09-09

## Access now

Run `npm run backend`, then open http://localhost:3089/ and choose **Staff sign in**. Sign in with **fareed@barsys.com**. The landing-page desktop and mobile menus then show **Dashboard**. You can also bookmark http://localhost:3089/admin; it sends signed-out visitors to the login page.

The launcher in the workspace outputs folder, **Open Barsys Dashboard.command**, reuses the running server or starts this local installation and opens the dashboard. Keep its Terminal window open if it started the server. This local address only works on this computer. A copy of the source ZIP is not an online deployment.

Google sign-in must be completed separately in each browser. Sessions last eight hours, survive an app restart, and are revoked on sign-out. Only the exact verified Barsys Workspace account is authorized; another @barsys.com user is not automatically authorized. Account passwords remain with Google. No Gmail, Drive, contact, CRM or calendar permissions are requested.

## What was configured in GCP

Project: happy-hour-landing-version-2 (62880701168).

- Google Auth Platform app: Barsys Happy Hours.
- Support/developer contact: fareed@barsys.com.
- External audience in **Testing** mode; sole configured test user fareed@barsys.com. The project organization is vulcantronics.com, so an organization-only audience was not assumed to cover Barsys accounts.
- Web client: Barsys Happy Hours staff dashboard.
- Public client ID: 62880701168-obfj7mpqleosrvlpv3iifqttlpi07nlp.apps.googleusercontent.com.
- Registered JavaScript origins: http://localhost:3089, http://localhost, https://happyhours.barsys.com.
- No redirect URI is needed for the Google Identity Services JavaScript callback used here.
- The client ID is configured in local .env.local (excluded from packages). On a fresh checkout, create .env.local containing GOOGLE_CLIENT_ID followed by an equals sign and the public client ID above. It is public configuration, not a credential secret. No client secret is needed or stored for this flow.

No Cloud Run/Cloud SQL instance, DNS, public deployment, tracking, messaging or payment connection was created. Google Auth Platform still requires completed production branding information before switching from Testing to production audience; this does not prevent the verified owner test login.

## Implementation and verification

backend/auth.mjs verifies Google ID tokens using Google's official library, checks audience/issuer/expiry, verified exact email, Workspace hosted domain, subject, and a one-use nonce. The nonce is bound to a same-site HttpOnly challenge cookie and expires after five minutes. The server creates an opaque session cookie; only its SHA-256 hash is persisted. Production cookies use Secure and __Host- names. Sessions and challenges use the same PostgreSQL/SQLite adapter as inquiries. No auth data is placed in localStorage. Logout invalidates the server record. Admin API endpoints enforce authorization independently of link visibility. The shared staff bearer token and automatic local admin bypass have been removed.

Actual Chrome sign-in with fareed@barsys.com succeeded. Browser verification confirmed the Dashboard button, protected event access, email-attributed activity entry, sign-out, hidden Dashboard button after sign-out, and redirect from /admin to login. Tests cover unauthorized identities, forged/unverified claims, incorrect audience/issuer/domain, nonce replay, expiry, durable sessions and revocation. No fake development login endpoint is exposed. Mobile navigation was checked at 390px: Staff sign in appears and the page fits without horizontal overflow.

## Permanent access — next deployment step

After a separately approved deployment, use https://happyhours.barsys.com/admin or sign in on the landing page and choose Dashboard. That address is a proposed route on the existing domain; it is not live yet.

Remaining deployment work: verify billing and hosting/domain ownership; choose Cloud SQL region, size and backup/retention settings; test the PostgreSQL adapter against the provisioned instance; deploy the container to Cloud Run with least-privilege database credentials from Secret Manager; finalize production Google branding/privacy URLs and inquiry-receipt wording; add shared abuse controls suitable for multiple server instances; connect the domain and test HTTPS/cookies/login from another device. Existing instructions prohibit deployment, DNS changes and paid resource creation without approval. No changes to pricing or service terms are needed for this login feature.
