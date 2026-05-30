# Notes Cowork — SFU (голос + screen share)

Self-hosted mediasoup SFU для голосового чата и демонстрации экрана.
Запускается **отдельно** от основного Socket.io (который крутится на Render/Railway).
Render не подходит для SFU — нет UDP. Этот SFU нужно ставить на VPS.

---

## Что нужно от VPS

- Любой Linux VPS с публичным IPv4 (Hetzner CPX11, DigitalOcean basic droplet, Vultr — от $4/мес хватит для 10-20 одновременных пользователей).
- Открытые порты:
  - **TCP 4000** — сигналинг (Socket.io)
  - **UDP 40000-40100** — медиапотоки (RTP/RTCP)
  - **TCP 40000-40100** — fallback для клиентов, которые блокируют UDP
- Docker + docker-compose.

---

## Быстрый деплой (5 минут)

### 1. Подключитесь к VPS

```bash
ssh root@YOUR.PUBLIC.IP
```

### 2. Поставьте Docker (если ещё нет)

```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Откройте порты в файрволле

Для `ufw`:

```bash
ufw allow 4000/tcp
ufw allow 40000:40100/udp
ufw allow 40000:40100/tcp
ufw reload
```

Для облачных провайдеров (DigitalOcean / Hetzner / Vultr) — те же правила
в их веб-консоли security group.

### 4. Скопируйте папку `sfu/` на VPS

С локальной машины:

```bash
# из корня проекта VirtualCowork
rsync -avz --exclude node_modules sfu/ root@YOUR.PUBLIC.IP:/opt/notes-cowork-sfu/
```

Или просто `git clone` репозиторий на VPS и `cd sfu`.

### 5. Соберите и запустите

```bash
ssh root@YOUR.PUBLIC.IP
cd /opt/notes-cowork-sfu
cp .env.example .env
nano .env       # подставьте ANNOUNCED_IP=ВАШ.ПУБЛИЧНЫЙ.IP
docker compose up -d --build
docker compose logs -f
```

Должно появиться:

```
mediasoup: 2 worker(s) ready
SFU listening on :4000 (announcedIp=203.0.113.10, rtc 40000-40100)
```

### 6. Проверьте healthcheck

```bash
curl http://YOUR.PUBLIC.IP:4000/health
# {"status":"ok","rooms":0,"workers":2}
```

### 7. Подключите фронтенд (Vercel)

В Vercel → Project Settings → Environment Variables добавьте:

```
NEXT_PUBLIC_SFU_URL = http://YOUR.PUBLIC.IP:4000
```

Передеплойте — голос заработает.

---

## (Опционально) HTTPS через TLS-терминатор

Браузеры разрешают WebRTC с HTTPS-страницы только если сигналинг тоже идёт
по WSS. Если ваш сайт на https://, поставьте Caddy перед SFU:

```bash
# /etc/caddy/Caddyfile
sfu.example.com {
    reverse_proxy 127.0.0.1:4000
}
```

```bash
apt install caddy
systemctl reload caddy
```

И в Vercel:

```
NEXT_PUBLIC_SFU_URL = https://sfu.example.com
```

---

## Эксплуатация

| Действие             | Команда                          |
|----------------------|----------------------------------|
| Логи                 | `docker compose logs -f`         |
| Рестарт              | `docker compose restart`         |
| Обновить код         | `git pull && docker compose up -d --build` |
| Кол-во активных комнат | `curl localhost:4000/health`   |
| Остановить           | `docker compose down`            |

---

## Лимиты и масштабирование

| VPS                 | Одновременно в голосе |
|---------------------|------------------------|
| 1 vCPU / 2 GB       | ~15-20 пиров          |
| 2 vCPU / 4 GB       | ~40-50 пиров          |
| 4 vCPU / 8 GB       | ~100 пиров            |

При росте — добавить `NUM_WORKERS=N` (≈ кол-во CPU) и поднять верхнюю
границу `RTC_MAX_PORT` (по 100-200 портов на воркера).

---

## Диагностика

**Клиент не подключается:**

1. `curl http://VPS:4000/health` → должно вернуть JSON. Если нет —
   `docker compose logs -f` и смотреть стартап.
2. В DevTools → Network → WS должно быть соединение к `ws://VPS:4000/socket.io/`.
3. В DevTools → Console при попытке войти в голос — ошибки `ICE failed`
   означают, что UDP-порты 40000-40100 заблокированы файрволлом провайдера.
4. Проверить `ANNOUNCED_IP`: он должен быть тем IP, что пишет
   `curl ifconfig.me` с самого VPS. Любой NAT — сломается.

**Mediasoup worker died:**

Перезапустите контейнер. Если повторяется — добавьте свопа на VPS:

```bash
fallocate -l 1G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
```
