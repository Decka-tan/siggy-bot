#!/usr/bin/env bash
# Deploy siggy-web on the VPS from an already-loaded image.
#
# The image is built on a dev machine and shipped over SSH — never built here,
# `next build` needs more heap than this 2GB box can spare:
#   docker build -t ghcr.io/decka-tan/siggy-web:latest .
#   docker save ghcr.io/decka-tan/siggy-web:latest | ssh <vps> "sudo docker load"
#   ssh <vps> "sudo bash /opt/siggy-bot/scripts/deploy-siggy-web.sh"
#
# Secrets live in ENV_FILE (chmod 600), never in this script.

set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/decka-tan/siggy-web:latest}"
NAME="${NAME:-siggy-web}"
DOMAIN="${DOMAIN:-invoice.decka.my.id}"
ENV_FILE="${ENV_FILE:-/opt/siggy-bot/.siggy-web.env}"
DATA_DIR="${DATA_DIR:-/opt/siggy-bot/discord-bot/data}"
MEM_LIMIT="${MEM_LIMIT:-700m}"

[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE"; exit 1; }
[ -d "$DATA_DIR" ] || { echo "missing $DATA_DIR"; exit 1; }

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -m "$MEM_LIMIT" --memory-swap "$MEM_LIMIT" \
  --network coolify \
  --add-host=host.docker.internal:host-gateway \
  --env-file "$ENV_FILE" \
  -v "$DATA_DIR:/app/discord-bot/data" \
  --label traefik.enable=true \
  --label "traefik.http.routers.siggyweb.rule=Host(\`$DOMAIN\`)" \
  --label traefik.http.routers.siggyweb.entrypoints=https \
  --label traefik.http.routers.siggyweb.tls=true \
  --label traefik.http.routers.siggyweb.tls.certresolver=letsencrypt \
  --label traefik.http.routers.siggyweb.middlewares=siggyweb-root \
  --label 'traefik.http.middlewares.siggyweb-root.redirectregex.regex=^https?://[^/]+/?$' \
  --label "traefik.http.middlewares.siggyweb-root.redirectregex.replacement=https://$DOMAIN/invoice/dashboard" \
  --label traefik.http.services.siggyweb.loadbalancer.server.port=3000 \
  --label "traefik.http.routers.siggyweb-http.rule=Host(\`$DOMAIN\`)" \
  --label traefik.http.routers.siggyweb-http.entrypoints=http \
  --label traefik.http.routers.siggyweb-http.middlewares=siggyweb-tohttps \
  --label traefik.http.middlewares.siggyweb-tohttps.redirectscheme.scheme=https \
  "$IMAGE" >/dev/null

# The bot on the host still needs to reach it directly for local debugging.
echo "deployed $NAME -> https://$DOMAIN"
docker ps --filter "name=$NAME" --format '{{.Names}}  {{.Status}}'
