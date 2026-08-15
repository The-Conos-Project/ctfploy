#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/ctfploy-install.log"
mkdir -p "$(dirname "$LOG_FILE")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local msg="$1"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${ts}] ${msg}" >> "$LOG_FILE"
}

info() {
    log "INFO: $1"
    echo -e "${CYAN}▸${NC} $1"
}

success() {
    log "OK: $1"
    echo -e "${GREEN}✔${NC} $1"
}

warn() {
    log "WARN: $1"
    echo -e "${YELLOW}⚠${NC} $1"
}

fail() {
    log "ERROR: $1"
    echo -e "${RED}✖${NC} $1" >&2
    exit 1
}

step() {
    echo ""
    echo -e "${BLUE}━━━${NC} ${1} ${BLUE}━━━${NC}"
    log "STEP: $1"
}

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Conos CTFploy Installer v1.0      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
log "INSTALL STARTED"

if [ "$(id -u)" -ne 0 ]; then
    fail "This script must be run as root"
fi

if ss -tulnp | grep -q ':80 '; then
    fail "Port 80 is already in use"
fi
if ss -tulnp | grep -q ':443 '; then
    fail "Port 443 is already in use"
fi

step "Checking prerequisites"
if command -v docker >/dev/null 2>&1; then
    success "Docker is installed ($(docker --version | awk '{print $3}' | tr -d ','))"
else
    info "Docker not found, installing..."
    log "Docker: installing via get.docker.com"
    curl -fsSL https://get.docker.com | sh >> "$LOG_FILE" 2>&1
    systemctl enable --now docker >> "$LOG_FILE" 2>&1
    success "Docker installed"
fi

if docker compose version >/dev/null 2>&1; then
    success "Docker Compose v2 detected"
else
    fail "Docker Compose v2 is required"
fi

step "Configuring server address"
if [ -z "${DOMAIN:-}" ]; then
    info "DOMAIN not set, auto-detecting public IP..."
    PUBLIC_IP=$(curl -4s --connect-timeout 5 https://ifconfig.io 2>/dev/null || \
                curl -4s --connect-timeout 5 https://icanhazip.com 2>/dev/null || \
                curl -4s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null || true)
    if [ -n "$PUBLIC_IP" ]; then
        DOMAIN="$PUBLIC_IP"
        success "Detected public IP: ${DOMAIN}"
    else
        DOMAIN="localhost"
        warn "Could not detect public IP, using localhost"
    fi
else
    success "Using provided DOMAIN=${DOMAIN}"
fi

step "Preparing directories"
mkdir -p /etc/ctfploy/data /etc/ctfploy/nginx
success "Directories ready at /etc/ctfploy"

step "Generating credentials"
if [ ! -f /etc/ctfploy/.env ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9')
    SECRET_KEY=$(openssl rand -hex 32)
    cat > /etc/ctfploy/.env <<EOF
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SECRET_KEY=${SECRET_KEY}
PLATFORM_IMAGE=${PLATFORM_IMAGE:-zohidjonmarufov/ctfploy-platform:main}
EOF
    success "Generated admin password and secret key"
else
    source /etc/ctfploy/.env
    success "Using existing /etc/ctfploy/.env"
fi
log "Credentials: admin password set, secret key set"

step "Writing docker-compose.yml"
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

  certbot-renew:
    image: certbot/certbot:latest
    volumes:
      - ctfploy-acme:/var/www/certbot
      - ctfploy-certs:/etc/letsencrypt
    entrypoint: ["/bin/sh", "-c", "certbot renew --webroot -w /var/www/certbot --quiet"]
    restart: "no"

volumes:
  ctfploy-acme:
    name: ctfploy-acme
  ctfploy-certs:
    name: ctfploy-certs
COMPOSE
success "docker-compose.yml written"

step "Writing nginx configuration"
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

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
NGINX
success "nginx default.conf written"

step "Installing recovery command"
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
success "Recovery command installed at /usr/local/bin/ctfploy-reset-admin-password"

step "Configuring systemd services"
cat > /etc/systemd/system/ctfploy-platform.service <<'SERVICE'
[Unit]
Description=CTFploy Platform
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/etc/ctfploy
ExecStartPre=/usr/bin/docker compose pull
ExecStart=/usr/bin/docker compose up -d --force-recreate
ExecStop=/usr/bin/docker compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/systemd/system/ctfploy-certbot.service <<'SERVICE'
[Unit]
Description=CTFploy Certbot Certificate Renewal
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStartPre=/usr/bin/docker compose -f /etc/ctfploy/docker-compose.yml ps -q nginx | xargs -r docker inspect --format '{{.State.Status}}'
ExecStart=/usr/bin/docker compose -f /etc/ctfploy/docker-compose.yml run --rm certbot-renew
StandardOutput=journal
StandardError=journal
SERVICE

cat > /etc/systemd/system/ctfploy-certbot.timer <<'TIMER'
[Unit]
Description=Daily CTFploy certificate renewal check

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
TIMER

systemctl daemon-reload
systemctl enable --now ctfploy-platform.service >> "$LOG_FILE" 2>&1
systemctl enable --now ctfploy-certbot.timer >> "$LOG_FILE" 2>&1
success "Systemd units enabled (ctfploy-platform.service, ctfploy-certbot.timer)"

step "Pulling and starting containers"
cd /etc/ctfploy
info "Pulling images..."
docker compose pull >> "$LOG_FILE" 2>&1
success "Images pulled"
info "Starting containers..."
docker compose up -d >> "$LOG_FILE" 2>&1
success "Containers started"

step "Installation complete"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Conos CTFploy is running!         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Admin panel:  ${YELLOW}http://${DOMAIN}/admin/sign-in${NC}"
echo -e "  Username:     ${YELLOW}root${NC}"
echo -e "  Password:     ${YELLOW}${ADMIN_PASSWORD}${NC}"
echo ""
echo -e "  Recovery:     ${CYAN}sudo ctfploy-reset-admin-password${NC}"
echo -e "  Log file:     ${CYAN}${LOG_FILE}${NC}"
echo ""

log "INSTALL FINISHED SUCCESSFULLY"
