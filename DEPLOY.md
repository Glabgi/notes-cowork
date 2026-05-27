# Notes Cowork — Деплой (I.C-E.F Notes Project)

## Архитектура (бесплатный тир)

```
┌──────────────────────────┐    ┌──────────────────────────┐
│  Vercel (Next.js)         │    │  Railway / Render         │
│  - Фронтенд + API routes  │◄──►│  Socket.io (реалтайм)     │
│  БЕСПЛАТНО                │    │  БЕСПЛАТНО (500ч/мес)     │
└──────────────────────────┘    └──────────────────────────┘
            │
            ▼
┌──────────────────────────┐
│  Supabase                 │
│  - Auth (email/пароль)    │
│  - PostgreSQL             │
│  - Прогресс пользователей │
│  БЕСПЛАТНО (500MB)        │
└──────────────────────────┘
```

---

## Шаг 1 — Supabase (auth + БД)

1. Создай проект на [supabase.com](https://supabase.com) (бесплатно)
2. Открой **SQL Editor → New query** и выполни весь `supabase/schema.sql`
3. **Authentication → Providers**: убедись что `Email` включён (по умолчанию)
4. **Authentication → URL Configuration**: добавь Vercel URL в `Site URL` и `Redirect URLs`
5. **Settings → API**: скопируй `Project URL` и `anon public key`

---

## Шаг 2 — Socket.io сервер на Railway

1. Push код на GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub → выбери репо
3. **Settings → Build & Deploy**:
   - Start command: `npm run start:socket`
4. **Settings → Networking**: Generate Domain → копируй URL вида `https://your-app.up.railway.app`

(Альтернатива: [Render.com](https://render.com) — бесплатно, но засыпает через 15 мин простоя)

---

## Шаг 3 — Next.js на Vercel

```bash
npm i -g vercel
vercel --prod
```

Или через UI: vercel.com → Import Project → выбери GitHub репо.

### Environment Variables (добавить в Vercel → Settings → Environment Variables):

```
NEXT_PUBLIC_SOCKET_URL=https://your-app.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Передеплой после добавления переменных: **Deployments → Redeploy**.

---

## Локальная разработка

```bash
# Скопируй env шаблон
cp .env.example .env.local
# заполни NEXT_PUBLIC_SUPABASE_* (Socket URL можно оставить http://localhost:3001)

# Запуск Next.js + Socket.io вместе
npm run dev

# Или раздельно:
npm run dev:next    # :3000
npm run dev:socket  # :3001
```

---

## Что работает онлайн

| Функция | Где |
|---------|-----|
| Регистрация / вход по email + пароль | Supabase Auth |
| Сохранение помидорок и фокус-минут | Supabase `record_pomodoro` RPC |
| Dashboard читает реальную статистику | Supabase `daily_stats` |
| Видеть друг друга в комнате, чат | Socket.io |
| Публичные / приватные сессии | Socket.io + флаг `isPrivate` |
| Игры онлайн (шахматы, крестики, морской бой) | Socket.io |
| Расписание | localStorage (личное) |
| Ambient звуки | Web Audio API (клиент) |

---

## Стоимость

- **Vercel**: бесплатно — 100 GB трафика/мес
- **Railway**: бесплатно — 500 ч/мес (≈ 21 день непрерывной работы)
- **Supabase**: бесплатно — 500 MB БД, неограниченные auth users
- **Итого для до ~30 одновременных пользователей**: **$0**

---

## Чек-лист перед деплоем

- [ ] `supabase/schema.sql` применён в Supabase
- [ ] Socket.io работает на Railway/Render, URL получен
- [ ] 3 переменные окружения добавлены в Vercel
- [ ] Vercel deployment прошёл без ошибок
- [ ] Регистрация работает (создать тестового юзера)
- [ ] Помидорка завершается → запись появилась в `daily_stats` (проверить SQL: `select * from daily_stats;`)
- [ ] Создание комнаты + второй браузер видят друг друга
