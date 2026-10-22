# Preserve the exact guided Collins production release, including unmerged UI.
FROM us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app@sha256:967e8b7425ef5ece900903f4fae63814f1b9c6cc174bb29d2dfeb7817e7dad7e
USER root
COPY patch.mjs /tmp/apex-consent-patch.mjs
RUN node /tmp/apex-consent-patch.mjs /app && rm /tmp/apex-consent-patch.mjs
USER node
