# Production-preserving Apex analytics overlay

The public site received collins-repair-1022 during rollout, digest
13290bf85aec281c4334b066b9e0de59778dc5a84764867cce7a2e48b3c9a178.
The final overlay preserves that newer release.
Neither this Git checkout nor the other local checkout contains every shipped
HTML change. Do not deploy the whole checkout to update analytics.

Build only this directory. The Dockerfile retains that exact production image
and patches public HTML under /app/index.html and /app/site plus the reviewed
runtime notice. It adds one authenticated aggregate-reporting route to the existing API and
a small reporting module. Collins, assets, pricing, database contents and
hidden-wizard behavior are preserved. Google verifies the existing Apex service identity for the aggregate feed;
no customer fields, new stored credentials or IAM grants are involved. Unknown notice text fails the build.

Deploy the resulting digest at zero traffic, inspect the candidate, then shift
traffic. Preserve existing service environment and secret bindings. Immediate
rollback: barsys-happyhours-production-collins-repair-1022 at 100% traffic.

The owner approved publishing these integrations on October 22, 2026.
The read-only Events aggregate feed supplies saved inquiry and explicitly confirmed booking counts. Revenue attribution remains unavailable. The SEO overlay also corrects directory slugs so the blog sitemap entry resolves.
