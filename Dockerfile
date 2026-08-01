# siggy-web — built on your machine, pulled by Coolify on the VPS.
#
# The VPS has 2GB RAM and `next build` needs >700MB of heap on its own
# (measured: OOM at 700, clean at 1024), so it must never build there.
#
#   docker login ghcr.io -u Decka-tan     # password = GitHub PAT, scope write:packages
#   docker build -t ghcr.io/decka-tan/siggy-web:latest .
#   docker push ghcr.io/decka-tan/siggy-web:latest
#
# Keep the package PRIVATE: the image bakes in extracted-data/, which is
# ~25MB of Discord member records.
#
# Node 20 to match the VPS, and because better-sqlite3 9.x has no prebuilt
# binaries for Node 22.

# ---------------------------------------------------------------- deps
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 (lib/data-manager.ts) and canvas may fall back to compiling.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- build
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Same ceiling proven to build cleanly; fails loudly instead of thrashing.
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ------------------------------------------------------------- runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# canvas needs its shared libs at runtime even though it is only built once.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Deliberately the stock `node` user (uid 1000), NOT a fresh 1001: the bind-mounted
# data dir on the VPS belongs to `ubuntu`, which is uid 1000. A mismatched uid still
# looks fine on Docker Desktop — its Windows mounts are 777 — and then silently
# fails to write on the real host.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Read at runtime through process.cwd(), so Next's dependency tracing never
# sees them and standalone will not copy them for us.
COPY --from=builder --chown=node:node /app/extracted-data ./extracted-data

# Mount point for the invoice/payment JSON the Discord bot shares with this app.
# MUST be bind-mounted to /opt/siggy-bot/discord-bot/data on the host, otherwise
# each side gets its own copy and the cross-process lock protects nothing.
RUN mkdir -p /app/discord-bot/data && chown -R node:node /app/discord-bot

USER node
EXPOSE 3000

CMD ["node", "server.js"]
