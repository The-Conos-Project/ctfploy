#!/bin/bash
set -e

# ---------- Colours ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Conos CTFploy Installer ===${NC}"

# Must be root
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This script must be run as root" >&2
    exit 1
fi

# Check ports
if ss -tulnp | grep ':80 ' >/dev/null; then
    echo "❌ Port 80 is already in use" >&2
    exit 1
fi
if ss -tulnp | grep ':443 ' >/dev/null; then
    echo "❌ Port 443 is already in use" >&2
    exit 1
fi

# Install Docker if missing
if ! command -v docker >/dev/null; then
    echo "🔧 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# Create data directory
mkdir -p /etc/ctfploy/data

# Generate secrets if not already present
if [ ! -f /etc/ctfploy/.env ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9')
    SECRET_KEY=$(openssl rand -hex 32)
    cat > /etc/ctfploy/.env <<EOF
ADMIN_PASSWORD=$ADMIN_PASSWORD
SECRET_KEY=$SECRET_KEY
PLATFORM_IMAGE=ghcr.io/the-conos-project/ctfploy-platform:main
EOF
else
    source /etc/ctfploy/.env
fi

# Write docker-compose.yml
cat > /etc/ctfploy/docker-compose.yml <<COMPOSE
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    restart: unless-stopped

  platform:
    image: \${PLATFORM_IMAGE}
    environment:
      ADMIN_PASSWORD: \${ADMIN_PASSWORD}
      SECRET_KEY: \${SECRET_KEY}
    volumes:
      - /etc/ctfploy/data:/data
      - /var/run/docker.sock:/var/run/docker.sock
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ctfploy.rule=Host(\`\${DOMAIN:-localhost}\`)"
      - "traefik.http.services.ctfploy.loadbalancer.server.port=8000"
    restart: unless-stopped
COMPOSE

# Pull images and start
cd /etc/ctfploy
docker compose pull
docker compose up -d

# Print success
echo -e "${GREEN}✅ Conos CTFploy is running!${NC}"
echo -e "Admin panel: http://${DOMAIN:-localhost}/admin/login"
echo -e "Admin password: ${ADMIN_PASSWORD}"