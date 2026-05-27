# Design Improvement: Session Page — Emoji & Iconography Pass

## TL;DR
Эмодзи в левой панели и на карточках участников частично заменены на Lucide, но в проекте всё ещё ~15 мест с эмодзи (помидоры на карточках, иконки активностей в расписании, иконки чата/реакций, splash/error экраны). Самый большой выигрыш — единая icon-система: один pictograph language вместо двух (Lucide + emoji), это поднимает воспринимаемое качество на уровень Linear / Intercom / Endel.

## Current State
![Current Design](references/current.png)
*Страница сессии Notes Cowork: таймер Помодоро, статус-селектор уже на Lucide (Zap/Coffee/Ghost), мини-расписание и контролы звуков. Слева видна целевая зона — статусы и расписание стали профессиональнее, но в правой части (чат, задачи) и на карточках участников эмодзи остались.*

## Improvement Ideas

### 1. Status selector — добавить системный "цветной маркер + иконка" как у Intercom ⭐ (highest impact)

В Notes Cowork сейчас иконка Lucide + цветной фон активной кнопки. У Intercom (категория Communication) используется паттерн: маленькая цветная "точка состояния" слева + иконка/текст. Это:
- мгновенно читается периферийным зрением (как у Slack `🟢 Available`)
- работает на маленьком превью на карточке участника, не теряя смысл
- не зависит от языка / эмодзи-шрифта

**Inspired by:**
![Intercom](references/intercom-agent-status.png)
*Intercom — agent workspace с status selector (Available/Away/Busy) в виде маленькой цветной точки + иконки [Lazyweb]*

**Why this works:** Цветовой маркер — это универсальный сигнал состояния, который не зависит от иконки. Иконка несёт смысл при наведении, точка — при беглом взгляде. У вас сейчас Lucide-иконка делает всю работу, и это перегруз для маленьких размеров (12-14px).

**Sketch:**
```
┌──────────────────────────────┐
│ МОЙ СТАТУС                   │
├──────────────────────────────┤
│ ● ⚡ В фокусе          ●     │  ← зелёная точка + Zap
│ ● ☕ Перерыв                 │  ← янтарная точка + Coffee
│ ● 👤 Отошёл                  │  ← серая точка + Ghost
├──────────────────────────────┤
│ [ Чем занимаюсь...      → ]  │
└──────────────────────────────┘
```

---

### 2. Помидоры на карточке участника — заменить ряд ●●● на progress arc или метрику

Сейчас на карточке: `⏱ 4 ● ● ● ● +0`. Это компромисс между метрикой и визуальным рядом. MagicFlow показывает focus score / deep work как **единый числовой токен с цветной полоской**. Это:
- честнее: число не растёт визуально бесконечно
- считывается быстрее в гриде из 10+ участников
- расширяемо: тот же стиль для focusMinutes, streaks, achievements

**Inspired by:**
![MagicFlow](references/magicflow-focus-metrics.png)
*MagicFlow — productivity dashboard с метриками "97% productivity / 29 min deep work / 78% focus score" в виде токенов с цветной шкалой [Lazyweb]*

**Why this works:** Ряд точек — это пережиток skeuomorphic эпохи (физических помидоров). Современные продуктивные приложения показывают прогресс как `4 🍅 · 2h focus` или `▰▰▰▰▱`. Освобождает место на карточке для имени и кастомного статуса.

**Sketch:**
```
┌──────────────────┐
│      [avatar]    │
│        ●         │
│      Albert      │
│   В фокусе       │
│ ────────────────  │
│ 4 ⏱  ·  2ч       │  ← число + единица, без декора
│ ▰▰▰▰▱▱▱          │  ← опциональная мини-полоска
└──────────────────┘
```

---

### 3. Иконки активностей расписания — Lucide вместо эмодзи (последний эмодзи-кластер)

В `lib/utils.ts` функция `getActivityIcon` всё ещё возвращает эмодзи:
```
work: '💻', reading: '📖', creative: '🎨', exercise: '🏋️',
gaming: '🎮', meditation: '🧘', meeting: '📞'
```
Эти эмодзи появляются в `DayScheduler`, селекторе активности и мини-расписании на странице сессии. Это разрушает визуальную консистентность с уже сделанными Lucide-иконками.

**Inspired by:**
![Opal](references/opal-focus-features.png)
*Opal — focus app, использует только монохромную icon-систему для всех features, milestones и categories [Lazyweb]*

**Why this works:** Один pictograph language = один tone-of-voice. Эмодзи рендерятся по-разному на macOS/Windows/Android, имеют разный цвет и stroke-weight. Lucide — единый stroke-based, размер/цвет наследуется от текста.

**Маппинг для замены:**
```
work        → Briefcase   или Code2
reading     → BookOpen
creative    → Palette
exercise    → Dumbbell
gaming      → Gamepad2
meditation  → Leaf        или Sparkles
meeting     → Phone       или Video
```

**Sketch:**
```
До:                       После:
💻 Работа / учёба    →    [⬚] Работа / учёба
📖 Чтение            →    [📕] Чтение         (Lucide BookOpen)
🎮 Игровой перерыв   →    [🎮] Игровой...     (Lucide Gamepad2)
```

---

### 4. Чат — реакции и пустое состояние без эмодзи

В `ChatPanel`/`SidePanel` пустые состояния и кнопка-реакции используют эмодзи. Best-in-class чаты (Linear inbox, Userguiding team chat) показывают:
- empty state — Lucide `MessageSquareDashed` + текст
- реакции — Lucide `SmilePlus` → открывает picker (а в самих реакциях — emoji остаются, это ок, они user-generated)

**Inspired by:**
![Userguiding](references/userguiding-team-directory.png)
*Userguiding — team directory с участниками, status indicators, иконка чата — везде один stroke-based стиль [Lazyweb]*

**Why this works:** Системные иконки (UI shell) должны быть в одном языке. User-generated контент (реакции в чате) — это отдельный слой, и там эмодзи уместны. Сейчас граница размыта: где UI, а где пользовательский ввод — непонятно.

**Sketch:**
```
┌────────────────────────────┐
│ Чат                        │
│ 0 сообщений                │
├────────────────────────────┤
│                            │
│       [MessageSquare]      │  ← Lucide, не 💬
│   Пока никто не написал    │
│                            │
└────────────────────────────┘
```

---

### 5. Звуки — добавить визуализатор (waveform/equalizer) для активного звука

Endel — эталон ambient-аудио интерфейса. У вас сейчас 4 кнопки и слайдер громкости — функционально, но "статично". Активный звук можно показывать живым: 3-4 палочки equalizer пульсируют, делая ясным, что **сейчас что-то играет** (это особенно полезно когда звук тихий и пользователь сомневается).

**Inspired by:**
![Endel](references/endel-focus-soundscape.png)
*Endel — focus & soundscape app, активный звук показан как мягкая живая волна, плюс маленькая анимация при паузе [Lazyweb]*

**Why this works:** Визуальная обратная связь = пользователь не дёргает кнопку дважды и не теряется. Технически реализуется через `AnalyserNode` Web Audio API (3 строки кода поверх вашего `ambientAudio.ts`).

**Sketch:**
```
┌─────────────────────────────┐
│ 🔊 ЗВУКИ      ▁▃▅▃▁ ▮▮▮▮▮ │  ← equalizer + volume
├─────────────────────────────┤
│ [☕ Кафе] (active, glowing) │
│ [🌳 Лес ]                   │
│ [🌬 Шум ]    [💧 Дождь]     │
└─────────────────────────────┘
```

---

## What's Working

- **Pomodoro timer** — круг, дисплей `25:00`, дискретные фазы внизу — это шаблон, как у Focus To Do (см. референс). Хорошо.
  ![FocusToDo](references/focustodo-pomodoro.png)
  *Focus To Do — Pomodoro timer (тот же визуальный шаблон, что у вас) [Lazyweb]*
- **Левая колонка как "control surface"** — таймер + статус + расписание + звуки в одной колонке = всё что нужно для сессии в peripheral vision. Это сильнее, чем у большинства pomodoro-приложений.
- **Кастомный статус** — поле ввода прямо под статус-кнопками. Это редкая фича (Slack делает в отдельной модалке), и у вас она быстрее.
- **Ambient звуки через Web Audio API** — нет внешних зависимостей, это правильно для бесплатного деплоя.
- **Брендинг "Notes Cowork / I.C-E.F Notes project"** — двухстрочный логотип читается как product + parent project, это профессиональный паттерн (как `Atlassian → Jira`).

---

## All References

| # | Source | Что важно |
|---|--------|-----------|
| 1 | **Intercom** [Lazyweb] | Agent status selector — точка + иконка |
| 2 | **MagicFlow** [Lazyweb] | Focus metrics как числовые токены |
| 3 | **Opal** [Lazyweb] | Монохромная icon-система для всех features |
| 4 | **Userguiding** [Lazyweb] | Team directory, единый stroke-стиль |
| 5 | **Endel** [Lazyweb] | Ambient sound UI с живым визуализатором |
| 6 | **Focus To Do** [Lazyweb] | Pomodoro таймер (валидирует вашу метафору круга) |
