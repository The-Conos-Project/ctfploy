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

if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose v2 is required. Install the docker-compose-plugin and run this installer again." >&2
    exit 1
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

mkdir -p /etc/ctfploy/data /etc/ctfploy/nginx

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
      - /etc/ctfploy/nginx:/etc/nginx/conf.d:ro
      - ctfploy-acme:/var/www/certbot:ro
      - ctfploy-certs:/etc/letsencrypt:ro
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
      - /etc/ctfploy/nginx:/etc/ctfploy/nginx
      - ctfploy-acme:/var/www/certbot
      - ctfploy-certs:/etc/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  ctfploy-acme:
    name: ctfploy-acme
  ctfploy-certs:
    name: ctfploy-certs
COMPOSE

# Create a simple Nginx config that routes by domain/IP
cat > /etc/ctfploy/nginx/default.conf <<'NGINX'
server {
    listen 80;
    server_name _;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

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

# Recovery is deliberately local-only: it requires root on the VPS and updates
# the environment file used by the platform container.
cat > /usr/local/bin/ctfploy-reset-admin-password <<'RESET_ADMIN'
#!/bin/bash
set -euo pipefail

ENV_FILE=/etc/ctfploy/.env
COMPOSE_FILE=/etc/ctfploy/docker-compose.yml

if [ "$(id -u)" -ne 0 ]; then
    echo "Run this command as root: sudo ctfploy-reset-admin-password" >&2
    exit 1
fi
if [ ! -f "$ENV_FILE" ] || [ ! -f "$COMPOSE_FILE" ]; then
    echo "CTFploy is not installed at /etc/ctfploy." >&2
    exit 1
fi

NEW_PASSWORD=${1:-}
if [ -z "$NEW_PASSWORD" ]; then
    read -r -s -p "New CTFploy admin password: " NEW_PASSWORD
    echo
fi
if ! [[ "$NEW_PASSWORD" =~ ^[A-Za-z0-9_-]{12,128}$ ]]; then
    echo "Password must be 12-128 characters using letters, numbers, _ or -." >&2
    exit 1
fi

TEMP_FILE=$(mktemp /etc/ctfploy/.env.XXXXXX)
trap 'rm -f "$TEMP_FILE"' EXIT
awk -v password="$NEW_PASSWORD" 'BEGIN { found=0 } /^ADMIN_PASSWORD=/ { print "ADMIN_PASSWORD=" password; found=1; next } { print } END { if (!found) print "ADMIN_PASSWORD=" password }' "$ENV_FILE" > "$TEMP_FILE"
chmod 600 "$TEMP_FILE"
mv "$TEMP_FILE" "$ENV_FILE"
trap - EXIT

docker compose -f "$COMPOSE_FILE" up -d --force-recreate platform
echo "CTFploy admin password reset. Sign in as root with the new password."
RESET_ADMIN
chmod 700 /usr/local/bin/ctfploy-reset-admin-password

cd /etc/ctfploy
docker compose pull
docker compose up -d

echo -e "${GREEN}✅ Conos CTFploy is running!${NC}"
echo -e "Admin panel: http://${DOMAIN}/admin/sign-in"
echo -e "Admin username: root"
echo -e "Admin password: ${ADMIN_PASSWORD}"
echo -e "Recovery command: sudo ctfploy-reset-admin-password"
