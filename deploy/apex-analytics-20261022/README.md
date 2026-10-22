# Production-preserving Apex analytics overlay

The public site runs guided-1021-v2, digest
967e8b7425ef5ece900903f4fae63814f1b9c6cc174bb29d2dfeb7817e7dad7e.
Neither this Git checkout nor the other local checkout contains every shipped
HTML change. Do not deploy the whole checkout to update analytics.

Build only this directory. The Dockerfile retains that exact production image
and patches public HTML under /app/index.html and /app/site plus the reviewed
runtime notice. It leaves the backend, Collins, assets, pricing, environment,
database and hidden-wizard behavior intact. Unknown notice text fails the build.

Deploy the resulting digest at zero traffic, inspect the candidate, then shift
traffic. Preserve existing service environment and secret bindings. Immediate
rollback: barsys-happyhours-production-guided-1021-v2 at 100% traffic.

The owner approved publishing these integrations on October 22, 2026.
Server-side confirmed-inquiry/revenue attribution is not part of this overlay.
