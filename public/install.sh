#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Conos CTFploy Installer ===${NC}"

if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This script must be run as root" >&2
    exit 1
fi

if ss -tulnp | grep ':80 ' >/dev/null; then
    echo "❌ Port 80 is already in use" >&2
    exit 1
fi
if ss -tulnp | grep ':443 ' >/dev/null; then
    echo "❌ Port 443 is already in use" >&2
    exit 1
fi

if ! command -v docker >/dev/null; then
    echo "🔧 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# Auto-detect public IP if DOMAIN not set
if [ -z "$DOMAIN" ]; then
    echo "🌐 Detecting server IP..."
    PUBLIC_IP=$(curl -4s --connect-timeout 5 https://ifconfig.io 2>/dev/null || \
                curl -4s --connect-timeout 5 https://icanhazip.com 2>/dev/null || \
                curl -4s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null)
    if [ -n "$PUBLIC_IP" ]; then
        DOMAIN="$PUBLIC_IP"
    else
        DOMAIN="localhost"
    fi
fi

mkdir -p /etc/ctfploy/data

if [ ! -f /etc/ctfploy/.env ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9')
    SECRET_KEY=$(openssl rand -hex 32)
    cat > /etc/ctfploy/.env <<EOF
ADMIN_PASSWORD=$ADMIN_PASSWORD
SECRET_KEY=$SECRET_KEY
PLATFORM_IMAGE=${PLATFORM_IMAGE:-zohidjonmarufov/ctfploy-platform:main}
EOF
else
    source /etc/ctfploy/.env
fi

cat > /etc/ctfploy/docker-compose.yml <<COMPOSE
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/ctfploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
    depends_on:
      - platform

  platform:
    image: \${PLATFORM_IMAGE}
    environment:
      ADMIN_PASSWORD: \${ADMIN_PASSWORD}
      SECRET_KEY: \${SECRET_KEY}
    volumes:
      - /etc/ctfploy/data:/data
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
COMPOSE

# Create a simple Nginx config that routes by domain/IP
cat > /etc/ctfploy/nginx.conf <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://platform:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # For SSE (build logs)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
NGINX

cd /etc/ctfploy
docker compose pull
docker compose up -d

echo -e "${GREEN}✅ Conos CTFploy is running!${NC}"
echo -e "Admin panel: http://${DOMAIN}/admin/sign-in"
echo -e "Admin password: ${ADMIN_PASSWORD}"