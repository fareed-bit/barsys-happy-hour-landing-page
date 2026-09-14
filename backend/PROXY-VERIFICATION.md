# Trusted ingress verification

Default BARSYS_TRUSTED_PROXY_HOPS=0 ignores all X-Forwarded-For values. Authenticated requests use the verified account identity for rate limiting, so staff do not share a proxy bucket.

Before public activation, verify the actual deployed ingress chain with controlled requests from two independent clients and caller-supplied fake forwarding prefixes. Set the exact trusted hop count only when the platform appends a verified suffix. Selection counts from the right. Missing/malformed chains fall back to the socket peer. A directly reachable alternate ingress path must not bypass the assumed proxy chain.

Unit tests prove parsing and prefix resistance for a specified chain. They do not prove Cloud Run's actual chain. Production now uses BARSYS_TRUSTED_PROXY_HOPS=1 after the verification below; staging remains at its default. If ingress cannot be verified, use an explicitly configured trusted edge and restrict bypass routes rather than trusting the first header value.

## Direct Cloud Run verification — September 10, 2026

A temporary service with no secrets or database access emitted only hashes of the observed address chain. Requests from this Mac and Cloud Build had different rightmost client hashes. Adding one or two caller-supplied prefixes did not change each client’s rightmost hash. Both numeric and alias run.app hostnames used the same suffix behavior. Cloud Build bbfd2ce8-0c11-477a-8c12-58da8dee292f passed. The diagnostic service was deleted afterward.

Production revision 00005-w6v sets one trusted hop. A 35-request production auth-challenge burst with changing spoofed prefixes returned 30 HTTP 200 and five HTTP 429 within one minute. No credentials or challenge bodies were retained. This proves the current ingress and route, not every possible future proxy architecture. Reverify before adding a load balancer, CDN or another route to the service.
