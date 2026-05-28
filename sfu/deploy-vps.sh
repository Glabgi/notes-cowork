#!/usr/bin/env bash
# Deploy the mediasoup SFU on a Linux VPS (Ubuntu/Debian).
# Run ON the VPS as root, from inside the sfu/ directory after copying it there.
#
#   scp -r sfu root@YOUR_VPS_IP:/opt/notes-sfu
#   ssh root@YOUR_VPS_IP
#   cd /opt/notes-sfu && ANNOUNCED_IP=YOUR_VPS_IP bash deploy-vps.sh
#
set -euo pipefail

ANNOUNCED_IP="${ANNOUNCED_IP:?Set ANNOUNCED_IP=<your VPS public IPv4>}"
SFU_PORT="${SFU_PORT:-4000}"
RTC_MIN="${RTC_MIN_PORT:-40000}"
RTC_MAX="${RTC_MAX_PORT:-40100}"
APP_DIR="$(pwd)"

echo "== 1/5 system deps (node 20, build tools, python for mediasoup) =="
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y build-essential python3 python3-pip net-tools

echo "== 2/5 npm install (compiles mediasoup native worker) =="
npm install --omit=dev

echo "== 3/5 firewall: open SFU + RTC ports =="
if command -v ufw >/dev/null; then
  ufw allow ${SFU_PORT}/tcp || true
  ufw allow ${RTC_MIN}:${RTC_MAX}/udp || true
  ufw allow ${RTC_MIN}:${RTC_MAX}/tcp || true
fi

echo "== 4/5 systemd service =="
cat >/etc/systemd/system/notes-sfu.service <<EOF
[Unit]
Description=Notes Cowork mediasoup SFU
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=ANNOUNCED_IP=${ANNOUNCED_IP}
Environment=SFU_PORT=${SFU_PORT}
Environment=RTC_MIN_PORT=${RTC_MIN}
Environment=RTC_MAX_PORT=${RTC_MAX}
ExecStart=$(command -v node) ${APP_DIR}/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable notes-sfu
systemctl restart notes-sfu
sleep 2

echo "== 5/5 health check =="
curl -s "http://127.0.0.1:${SFU_PORT}/health" && echo
echo ""
echo "✓ SFU running on :${SFU_PORT}  (RTC ${RTC_MIN}-${RTC_MAX} udp/tcp, announced ${ANNOUNCED_IP})"
echo ""
echo "NEXT: front-end env on Vercel →  NEXT_PUBLIC_SFU_URL=http://${ANNOUNCED_IP}:${SFU_PORT}"
echo "      (for HTTPS sites browsers require wss/https — put the SFU behind a TLS"
echo "       reverse-proxy, e.g. Caddy, and use NEXT_PUBLIC_SFU_URL=https://voice.yourdomain)"
