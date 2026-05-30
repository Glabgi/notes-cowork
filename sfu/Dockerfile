# ─────────────────────────────────────────────────────────────────────────────
# Notes Cowork SFU — mediasoup (Node 20 + native build deps)
# Используется с `network_mode: host` в docker-compose, чтобы UDP-порты
# 40000-40100 были напрямую доступны на сетевом интерфейсе VPS.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# mediasoup собирает worker через node-gyp → нужны Python + C++ toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip build-essential pkg-config ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала только package.json — кэшируется
COPY package.json ./
RUN npm install --omit=dev --build-from-source

# Исходники
COPY . .

# Сигнальный порт + диапазон RTP/RTCP
EXPOSE 4000/tcp
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

# Простейший healthcheck (контейнер запущен и Express отвечает)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${SFU_PORT:-4000}/health || exit 1

CMD ["node", "server.js"]
