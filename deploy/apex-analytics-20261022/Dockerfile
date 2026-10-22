# Preserve the latest live Collins repair, including its unmerged changes.
FROM us-east4-docker.pkg.dev/happy-hour-landing-version-2/barsys-staging/app@sha256:13290bf85aec281c4334b066b9e0de59778dc5a84764867cce7a2e48b3c9a178
USER root
COPY apex-reporting.mjs /app/backend/apex-reporting.mjs
COPY patch.mjs /tmp/apex-consent-patch.mjs
RUN node /tmp/apex-consent-patch.mjs /app && rm /tmp/apex-consent-patch.mjs
USER node
