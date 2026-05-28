# Notes Cowork — Voice SFU (mediasoup)

Self-hosted Selective Forwarding Unit for voice + screen share, ~20 peers/room.
Discord-style topology: each peer uploads once, the SFU forwards to everyone.

## Why a separate service
mediasoup needs **UDP ports + dedicated CPU + a public IP**. The main Socket.io
(rooms/chat/games) runs on Render free, which is HTTP/TCP-only and sleeps — it
**cannot** host media. So voice runs as its own service on a UDP-capable host
(your VPS). Frontend connects to both independently.

## Architecture
```
Browser ──ws (rooms/chat/games)──► Render Socket.io
   │
   └──ws (signaling) + WebRTC/UDP (media) ──► VPS : mediasoup SFU (this service)
        • 1 Router per room
        • send transport  → produce mic + screen
        • recv transport  → consume every other peer
        • ActiveSpeakerObserver → "who is talking" ring
```

## Ports to open on the VPS
- `4000/tcp` — signaling (Socket.io)  [SFU_PORT]
- `40000-40100/udp` and `/tcp` — RTP media  [RTC_MIN_PORT..RTC_MAX_PORT]

## Deploy
```bash
# from your Mac, in the project root:
scp -r sfu root@YOUR_VPS_IP:/opt/notes-sfu
ssh root@YOUR_VPS_IP
cd /opt/notes-sfu
ANNOUNCED_IP=YOUR_VPS_IP bash deploy-vps.sh
```
Then set on Vercel:
```
NEXT_PUBLIC_SFU_URL = http://YOUR_VPS_IP:4000
```

## ⚠ HTTPS requirement
The site is served over HTTPS (Vercel). Browsers block `ws://` and insecure
`getUserMedia` from HTTPS pages. For production you must terminate TLS in front
of the SFU:
```
voice.yourdomain.com  →  Caddy/Nginx (TLS)  →  127.0.0.1:4000
NEXT_PUBLIC_SFU_URL = https://voice.yourdomain.com
```
Caddy one-liner (auto-HTTPS): `caddy reverse-proxy --from voice.yourdomain.com --to :4000`

WebRTC media (UDP 40000-40100) stays direct to the VPS public IP via ICE — only
the signaling needs TLS.

## TURN (strict NAT ~10-15% of users)
mediasoup does ICE host/srflx; for users behind symmetric NAT add coturn:
```bash
apt-get install -y coturn
# /etc/turnserver.conf: listening-port=3478, external-ip=YOUR_VPS_IP, realm, user
```
Then pass `iceServers` (turn url + creds) into the client transports.

## Env reference
| Var | Default | Meaning |
|-----|---------|---------|
| ANNOUNCED_IP | 127.0.0.1 | public IPv4 announced in ICE (REQUIRED in prod) |
| SFU_PORT | 4000 | signaling port |
| RTC_MIN_PORT / RTC_MAX_PORT | 40000 / 40100 | media port range |
| NUM_WORKERS | #CPU cores | mediasoup workers |

## Local test
```bash
cd sfu && npm install
ANNOUNCED_IP=127.0.0.1 npm start
# frontend .env.local: NEXT_PUBLIC_SFU_URL=http://localhost:4000
```
