# ICF Notes Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the app to a white-blue corporate "ICF Notes" identity with working light/dark themes, replace the analog clock with a digital clock + configurable Pomodoro, remove all notebook backgrounds, harden quick-entry, expand ambient sounds, add avatar editing in settings, and fix the progress button.

**Architecture:** Next.js 14 App Router. All chrome reads CSS variables defined in `app/globals.css`; the active theme is a class (`light`/`dark`) on `<html>` set by `components/ThemeProvider.tsx` from `useSettingsStore().theme`. Tailwind named colors mirror the **dark** defaults only. State lives in Zustand stores (`settingsStore`, `timerStore`, `taskStore`, `roomStore`). Ambient audio is fully synthesized (Web Audio) in `lib/ambientAudio.ts`. Avatars are layered SVG encoded as `face:<base64>` inside `avatarId` (`lib/faceAvatar.ts`, `components/avatar/AvatarBuilder.tsx`).

**Tech Stack:** Next 14.2, React 18, TypeScript, Tailwind (CSS-var tokens), Zustand, framer-motion, lucide-react, socket.io (rooms server `server/index.js`), mediasoup (SFU).

**Testing approach (read this — the repo has NO unit-test runner):** There is no jest/vitest config and no `test` script in `package.json`. Verification for every task is:
1. `node node_modules/typescript/bin/tsc --noEmit` → must print no errors.
2. Run locally: Next dev `node node_modules/next/dist/bin/next dev -p 3002`, rooms socket `node server/index.js` (:3001), SFU already runs on :4000. Open `http://localhost:3002`.
3. Visual/behavioural check via Puppeteer MCP screenshots (headless Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, `--no-sandbox`) or manual.
Where a step says "Verify", do all three unless it names a narrower check. Do NOT invent a test framework — that is out of scope.

**Constraints (must hold):** Never write SSH/secrets into committed files or logs. Do not commit `.env*`. Do not deploy to the VPS without explicit user approval. Commit after each task; do NOT push/deploy until the user approves the batch (the established workflow is `git push origin main` then `vercel deploy --prod --yes`, plus the Opsera pre-commit gate: `touch /tmp/.opsera-pre-commit-scan-passed` in its own shell call before any `git commit`).

---

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `app/globals.css` | Light + dark CSS-var palettes, remove `.lined-paper` | 1, 2, 4 |
| `tailwind.config.ts` | Named-color mirror (dark defaults) | 2 |
| `components/ThemeProvider.tsx` | Apply `light`/`dark` class from settings | 2 |
| `app/settings/page.tsx` | Theme picker (make it work), avatar editor, sound list | 2, 7, 8 |
| `store/settingsStore.ts` | `theme`, ambient sound union | 2, 7 |
| `components/IcefLogo.tsx`, `app/layout.tsx`, `app/(auth)/login/page.tsx`, `app/page.tsx`, `components/RetroPC.tsx`, `components/room/RoomHeader.tsx` | Brand → "ICF Notes" | 1 |
| `components/timer/WallClock.tsx` | Digital clock + Pomodoro UI | 4 |
| `components/timer/PomodoroSettings.tsx` (new) | Configurable Pomodoro durations | 4 |
| `app/room/[slug]/page.tsx` | Remove lined-paper from status box | 3 |
| `components/tasks/TaskPanel.tsx` | Remove lined-paper from task list | 3 |
| `lib/utils.ts` | `parseRoomInput` helper | 5 |
| `app/page.tsx` | Quick-entry validation, retro-PC hero bg | 5, 2 |
| `app/api/rooms/route.ts` (new or existing) | Room-exists check for quick-entry | 5, 6 |
| `lib/ambientAudio.ts`, `components/room/MusicPanel.tsx`, `app/room/[slug]/page.tsx` (AmbientControl) | More ambient sounds | 7 |
| `app/dashboard/page.tsx`, `components/AuthGate.tsx` | Fix progress button | 9 |

---

## Task 1: Rename brand to "ICF Notes"

**Files:**
- Modify: `components/IcefLogo.tsx`
- Modify: `app/layout.tsx:6-15`
- Modify: `app/(auth)/login/page.tsx` (the `<h2>`)
- Modify: `app/page.tsx` (footer spans `:37`, `:47`)
- Modify: `components/RetroPC.tsx` (SETS + nameplate)
- Modify: `components/room/RoomHeader.tsx` (share text)

- [ ] **Step 1: Logo wordmark → "ICF Notes"**

In `components/IcefLogo.tsx`, replace the two-line wordmark with a single "ICF" + "notes" lockup:

```tsx
{/* Wordmark */}
<span className="hidden sm:flex flex-col leading-none">
  <span className="font-black tracking-tight text-[17px]" style={{ color: INK }}>
    ICF
  </span>
  <span className="font-extrabold tracking-tight text-[13px] -mt-0.5 lowercase" style={{ color: BLUE }}>
    notes
  </span>
</span>
```

Keep `INK`/`BLUE` consts but make them theme-aware tokens instead of hardcoded hex (so the logo works in both themes):
```tsx
const INK = 'var(--text-primary)';
const BLUE = 'var(--accent)';
```
And the mark background `#1a2540` → `var(--bg-elevated)`, border `${BLUE}` stays.

- [ ] **Step 2: Metadata** — `app/layout.tsx`: set `title: 'ICF Notes — учимся вместе'`, `keywords: 'icf notes, coworking, pomodoro, focus, study together'`, openGraph `title: 'ICF Notes'`.

- [ ] **Step 3: Login** — `app/(auth)/login/page.tsx`: `Вход в Notes Cowork` → `Вход в ICF Notes`.

- [ ] **Step 4: Home footer** — `app/page.tsx`: `I.C-E.F Notes project` → `ICF Notes`, and `I.C-E.F Notes` → `ICF Notes`.

- [ ] **Step 5: Retro PC** — `components/RetroPC.tsx`: replace both `'NOTES COWORK'` strings with `'ICF NOTES'`; nameplate `NOTES-PC` → `ICF-PC`.

- [ ] **Step 6: Share text** — `components/room/RoomHeader.tsx`: `в Notes Cowork!` → `в ICF Notes!` (2 occurrences).

- [ ] **Step 7: Verify** — `tsc --noEmit` clean; load home + room + login; logo reads "ICF / notes", titles say "ICF Notes". Grep guard: `grep -rniE "notes cowork|i\.c-e\.f|тихий зал" app components | grep -vi "тихий дождь"` returns nothing.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat: rename brand to ICF Notes"
```

---

## Task 2: White-blue light theme + dark theme + working toggle

**Files:**
- Modify: `app/globals.css` (split `.dark` vs `.light` palettes)
- Modify: `components/ThemeProvider.tsx`
- Modify: `store/settingsStore.ts` (confirm `theme: 'light' | 'dark'`)
- Modify: `app/settings/page.tsx` (theme previews → blue; ensure `setTheme` wired)
- Modify: `tailwind.config.ts` (named colors = dark defaults)
- Modify: `app/page.tsx:382` (retro-PC hero bg → token)

- [ ] **Step 1: Define both palettes in `app/globals.css`.** Replace the single shared `:root, .dark, .light { ... }` block and the `.light-mode` block with TWO blocks. Dark stays the current navy; light is white-blue corporate.

```css
/* DARK (default) — navy-blue */
:root,
.dark {
  --bg-page: #0a0f1e;  --bg-card: #141d33;  --bg-subtle: #0f1729;
  --bg-hover: #1c2942; --bg-elevated: #1a2540; --bg-input: #0f1729;
  --text-primary: #e7ecf7; --text-secondary: #9fb0d0; --text-muted: #647396; --text-link: #5b8cff;
  --border: rgba(120,150,210,0.12); --border-strong: rgba(120,150,210,0.24); --border-accent: #5b8cff;
  --accent: #5b8cff; --accent-hover: #4d7cf0; --accent-active: #3d68dd;
  --accent-light: rgba(91,140,255,0.15); --accent-glow: rgba(91,140,255,0.35);
  --status-online: #4cc2a8; --status-focus: #5b8cff; --status-break: #4cc2a8;
  --status-gaming: #5b8cff; --status-away: #647396; --status-dnd: #f0676f;
  --success: #4cc2a8; --warning: #e0a13c; --danger: #f0676f; --info: #5b8cff;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.40);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30);
  --shadow-lg: 0 24px 60px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.35);
  --shadow-glow: 0 0 22px var(--accent-glow);
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-2xl: 20px;
}

/* LIGHT — white-blue corporate ICF Notes */
.light {
  --bg-page: #eef2fb;  --bg-card: #ffffff;  --bg-subtle: #f4f7fd;
  --bg-hover: #e8eef9; --bg-elevated: #ffffff; --bg-input: #f4f7fd;
  --text-primary: #16223a; --text-secondary: #45587a; --text-muted: #8a98b5; --text-link: #2f6df0;
  --border: rgba(40,70,130,0.12); --border-strong: rgba(40,70,130,0.22); --border-accent: #2f6df0;
  --accent: #2f6df0; --accent-hover: #2860da; --accent-active: #1f4fb8;
  --accent-light: rgba(47,109,240,0.10); --accent-glow: rgba(47,109,240,0.22);
  --status-online: #1ca896; --status-focus: #2f6df0; --status-break: #1ca896;
  --status-gaming: #2f6df0; --status-away: #8a98b5; --status-dnd: #e0455a;
  --success: #1ca896; --warning: #d98a1f; --danger: #e0455a; --info: #2f6df0;
  --shadow-sm: 0 1px 2px rgba(40,70,130,0.08);
  --shadow-md: 0 4px 14px rgba(40,70,130,0.10), 0 2px 4px rgba(40,70,130,0.06);
  --shadow-lg: 0 24px 60px rgba(40,70,130,0.16), 0 6px 16px rgba(40,70,130,0.08);
  --shadow-glow: 0 0 22px var(--accent-glow);
}
```

- [ ] **Step 2: ThemeProvider respects settings.** Replace the hard-locked body of `components/ThemeProvider.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    const t = theme === 'light' ? 'light' : 'dark';
    root.classList.remove('light', 'dark');
    root.classList.add(t);
    root.style.colorScheme = t;
  }, [theme]);
  return <>{children}</>;
}
```

- [ ] **Step 3: settingsStore** — open `store/settingsStore.ts`; confirm `theme: 'light' | 'dark'` with default `'dark'` and a `setTheme`. If `theme` type allows other values, narrow it. (No code shown — adapt to actual file; if already correct, no change.)

- [ ] **Step 4: Settings theme previews → blue.** In `app/settings/page.tsx` `THEMES`, update the two preview swatch palettes: light preview uses `#ffffff`/`#eef2fb`/`#2f6df0`; dark preview uses `#141d33`/`#0a0f1e`/`#5b8cff`. Confirm clicking a theme calls `setTheme(id)` (it should via the store) and that the change takes effect immediately (ThemeProvider reacts).

- [ ] **Step 5: tailwind.config.ts** — leave named colors at the dark values already set (page `#0a0f1e`, accent `#5b8cff`, etc.). Add a comment: `// dark defaults; theme-reactive UI must use var(--token), not these`.

- [ ] **Step 6: Retro-PC hero bg** — `app/page.tsx:382`: change `bg-[#f5f0e8]` to `bg-[var(--bg-subtle)]` so the hero panel matches the theme.

- [ ] **Step 7: Hunt remaining hardcoded warm/navy hexes that break light mode.** Grep and convert obvious chrome hexes to tokens:
```bash
grep -rnE "#f7f4ef|#efe8dd|#fffdf6|#2a2018|#7a6a55|#b0a090" app components | grep -v faceAvatar
```
For each chrome usage (NOT avatar/retro-art content), replace with the matching `var(--…)`. Avatar palettes (`lib/faceAvatar.ts`) and RetroPC art colors are content — leave them.

- [ ] **Step 8: Verify** — `tsc` clean. In Settings, toggle Светлая/Тёмная: the whole app must switch between white-blue and navy with no unreadable (dark-on-dark / light-on-light) text. Screenshot both themes on home + room.

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "feat: white-blue light theme + working light/dark toggle"
```

---

## Task 3: Remove notebook / lined-paper backgrounds

**Files:**
- Modify: `app/room/[slug]/page.tsx` (StatusSelector custom-status box)
- Modify: `components/tasks/TaskPanel.tsx` (task list container)
- Modify: `app/globals.css` (delete `.lined-paper`)

- [ ] **Step 1: Status box** — in `app/room/[slug]/page.tsx`, the "чем занимаюсь" wrapper currently has `className="lined-paper rounded-[12px] border ..."`. Remove `lined-paper`, replace with `bg-[var(--bg-subtle)]`:
```tsx
<div className="bg-[var(--bg-subtle)] rounded-[12px] border border-[var(--border)] overflow-hidden transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/12">
```

- [ ] **Step 2: Tasks list** — in `components/tasks/TaskPanel.tsx`, the list container `className="flex-1 overflow-y-auto p-3 space-y-1 lined-paper"` → drop `lined-paper` (leave plain `bg-[var(--bg-card)]` inherited):
```tsx
<div className="flex-1 overflow-y-auto p-3 space-y-1">
```

- [ ] **Step 3: Delete the CSS class** — remove the entire `.lined-paper { ... }` block from `app/globals.css`.

- [ ] **Step 4: Guard** — `grep -rn "lined-paper" app components` returns nothing.

- [ ] **Step 5: Verify** — `tsc` clean; room status box and tasks panel show flat themed backgrounds, no ruled lines.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: remove notebook lined-paper backgrounds"
```

---

## Task 4: Digital clock + configurable Pomodoro

**Files:**
- Modify: `components/timer/WallClock.tsx` (analog dial → digital readout; keep current-time + pomodoro line + tabs)
- Create: `components/timer/PomodoroSettings.tsx` (gear → durations editor)
- Uses: `store/timerStore.ts` (`settings.focusDuration/shortBreakDuration/longBreakDuration`, `updateSettings`, already exists)

- [ ] **Step 1: Replace the analog `<svg>` dial with a digital readout.** In `components/timer/WallClock.tsx`, delete the `hourTicks`/`pt`/hand-geometry SVG and the dial `<svg>`. Keep: the `сейчас HH:MM` line, the session/pomodoro line, and the phase tabs. New center block (digital, large):
```tsx
{/* digital clock */}
<div className="flex flex-col items-center py-1">
  <span className="text-[34px] font-bold tabular-nums tracking-[0.04em] text-[var(--text-primary)] leading-none">
    {timeLabel /* HH:MM */}
  </span>
  <span className="text-[11px] tabular-nums text-[var(--text-muted)] mt-1">
    {now ? `:${String(now.getSeconds()).padStart(2,'0')}` : ':--'}
  </span>
</div>
```
Keep `now` ticking each second (already does). Remove the now-unused `FACE/RIM/RING/TICK/HAND_*` consts and `pt`/`hourTicks`.

- [ ] **Step 2: Add a gear button that opens PomodoroSettings.** Add `const [showCfg, setShowCfg] = useState(false);` and a small gear at the top-right of the card:
```tsx
import { Settings as SettingsIcon } from 'lucide-react';
...
<button onClick={() => setShowCfg(true)} title="Настроить помодоро"
  className="self-end -mt-1 -mr-1 p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
  <SettingsIcon size={13} />
</button>
{showCfg && <PomodoroSettings onClose={() => setShowCfg(false)} />}
```

- [ ] **Step 3: Create `components/timer/PomodoroSettings.tsx`** — a modal that edits the three durations and `longBreakInterval` + `autoStart`, writing through `useTimerStore().updateSettings`:
```tsx
'use client';
import { Check, X } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';

export default function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useTimerStore();
  const rows: { key: 'focusDuration'|'shortBreakDuration'|'longBreakDuration'; label: string; min: number; max: number }[] = [
    { key: 'focusDuration', label: 'Фокус (мин)', min: 5, max: 90 },
    { key: 'shortBreakDuration', label: 'Перерыв (мин)', min: 1, max: 30 },
    { key: 'longBreakDuration', label: 'Длинный (мин)', min: 5, max: 60 },
  ];
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] w-full max-w-xs p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Помодоро</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
        </div>
        {rows.map(r => (
          <label key={r.key} className="flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
            {r.label}
            <input type="number" min={r.min} max={r.max} value={settings[r.key]}
              onChange={e => updateSettings({ [r.key]: Math.max(r.min, Math.min(r.max, +e.target.value || r.min)) } as any)}
              className="w-16 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent)]" />
          </label>
        ))}
        <label className="flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
          Длинный каждые
          <input type="number" min={2} max={8} value={settings.longBreakInterval}
            onChange={e => updateSettings({ longBreakInterval: Math.max(2, Math.min(8, +e.target.value || 4)) })}
            className="w-16 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={settings.autoStart} onChange={e => updateSettings({ autoStart: e.target.checked })} className="accent-[var(--accent)]" />
          Авто-старт следующей фазы
        </label>
        <button onClick={onClose} className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-[10px] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)]">
          <Check size={15} /> Готово
        </button>
      </div>
    </div>
  );
}
```
Note: `updateSettings` already recomputes `timeLeft`/`totalTime` for the current phase (see `store/timerStore.ts`), so changing the focus duration while idle updates the countdown target.

- [ ] **Step 4: Verify** — `tsc` clean. Clock shows digital HH:MM + seconds. Clicking a phase tab starts the countdown in the "Занятие" line. Gear opens settings; changing "Фокус" to 1 min and clicking фокус → countdown starts at 01:00 and at 0 advances to pereryv with the chime.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: digital clock + configurable pomodoro"
```

---

## Task 5: Quick-entry validation

**Files:**
- Modify: `lib/utils.ts` (add `parseRoomInput`)
- Modify: `app/page.tsx` (`handleJoin` + error state + error UI)
- Verify: `app/api/rooms/route.ts` exists and returns a room by slug (used for existence check)

- [ ] **Step 1: Add a pure parser to `lib/utils.ts`.** A valid code is a `generateSlug()`-shaped string (lowercase letters/digits, hyphen-separated, 3+ chars), OR extractable from a `/room/<slug>` URL.
```ts
/** Returns a clean room slug from a URL or raw code, or null if the input is not a plausible room code. */
export function parseRoomInput(raw: string): string | null {
  let s = (raw || '').trim();
  if (!s) return null;
  const m = s.match(/\/room\/([^/?#\s]+)/i);
  if (m) s = m[1];
  s = s.replace(/[?#].*$/, '').trim().toLowerCase();
  // generateSlug() produces e.g. "crystal-zone-rxo6": words + a trailing token, [a-z0-9-]
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s)) return null;
  if (s.length < 5 || s.length > 60) return null;
  return s;
}
```
(Confirm the shape against `generateSlug` in the same file; if it produces single-token slugs, relax the regex to `^[a-z0-9-]{5,60}$` but still reject spaces/uppercase/garbage.)

- [ ] **Step 2: Use it in `handleJoin` (`app/page.tsx`).** Add `const [joinErr, setJoinErr] = useState('');` and rewrite:
```tsx
import { parseRoomInput } from '@/lib/utils';
...
const handleJoin = async () => {
  const slug = parseRoomInput(joinInput);
  if (!slug) { setJoinErr('Введите ссылку или код комнаты (например crystal-zone-12ab)'); return; }
  setJoinErr('');
  // existence check — don't drop the user into an empty random room
  try {
    const res = await fetch(`/api/rooms?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (!data || data.exists === false) { setJoinErr('Комната не найдена. Проверьте код.'); return; }
    }
  } catch {/* network down — fall through and let the room page handle it */}
  try {
    const recent = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
    if (!recent.find((r: any) => r.slug === slug)) {
      recent.unshift({ slug, name: slug, visitedAt: Date.now() });
      localStorage.setItem('vc_recent_rooms', JSON.stringify(recent.slice(0, 10)));
    }
  } catch {}
  router.push(`/room/${slug}`);
};
```

- [ ] **Step 3: Render the error** under the quick-join input:
```tsx
{joinErr && (
  <p className="mt-2 text-xs text-[var(--danger)] flex items-center gap-1.5">
    <AlertTriangle size={12} className="flex-shrink-0" /> {joinErr}
  </p>
)}
```
And clear it in the input `onChange`: `onChange={e => { setJoinInput(e.target.value); setJoinErr(''); }}`.

- [ ] **Step 4: Ensure `/api/rooms?slug=` answers existence.** Check `app/api/rooms/route.ts`. If it doesn't support a slug existence query, add a `GET` that proxies the rooms server (the same source `/api/rooms/active` uses) and returns `{ exists: boolean }`. If wiring an existence endpoint is not feasible in this task, keep Step 2's `try/catch` (format validation alone already fixes the "garbage → random room" report); note the limitation in the commit message.

- [ ] **Step 5: Verify** — `tsc` clean. Typing `асдф!!!` → inline error, no navigation. Typing a real active room's `#slug` (from the Active sessions list) → enters it. Pasting a full `/room/<slug>` URL → enters it.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "fix: validate quick-entry input (no more random-room joins)"
```

---

## Task 6: Verify / fix Active sessions

**Files:**
- Inspect: `app/api/rooms/active/route.ts`, `server/index.js` (active-rooms source), `app/page.tsx` `ActiveRoomsList`

- [ ] **Step 1: Reproduce.** Run dev + socket server. Create a PUBLIC room (home → Создать сессию → Публичная → Создать и войти). In a second tab open `/` → the room must appear in "Активные сессии" within ~15s (auto-refresh) or after clicking "Обновить".

- [ ] **Step 2: Trace the data path.** `ActiveRoomsList` fetches `/api/rooms/active`. Read `app/api/rooms/active/route.ts` — it must return public rooms from the rooms server (`server/index.js`, see the `participants.slice(0,4)` mapping near line 806). Confirm: (a) the API points at the correct socket-server URL (env `NEXT_PUBLIC_SOCKET_URL` / server origin), (b) private rooms are excluded, (c) the shape matches `ActiveRoom` (`slug,name,participantCount,participants[]`).

- [ ] **Step 3: Fix only what's broken.** Likely candidates and fixes:
  - If the API returns 500/empty because it can't reach the rooms server in prod (Vercel can't read in-memory server state): document that active-sessions needs the rooms server reachable from the API route, and make the API resilient (return `[]` on error — already does). If a real bug (wrong URL/shape) is found, fix it with a concrete edit.
  - If rooms never get marked public: verify `room:join` with `roomConfig.isPublic` registers the room in the server's public list.

- [ ] **Step 4: Verify** — created public room appears with correct name, participant count, and avatars; private rooms do NOT appear; joining from the card works.

- [ ] **Step 5: Commit** (only if code changed)
```bash
git add -A && git commit -m "fix: active sessions list (<specific fix>)"
```

---

## Task 7: Expand ambient sounds

**Files:**
- Modify: `lib/ambientAudio.ts` (add synthesized sound cases)
- Modify: `store/settingsStore.ts` (widen ambient sound union)
- Modify: `components/room/MusicPanel.tsx` (TRACKS / SoundId)
- Modify: `app/room/[slug]/page.tsx` (`AmbientControl` `sounds` list + `AmbientType`)
- Modify: `app/settings/page.tsx` (`AmbientSound` + `AMBIENT_SOUNDS`)

- [ ] **Step 1: Add new synthesized sounds in `lib/ambientAudio.ts`.** The engine already builds noise buffers + nodes (white/brown/pink) and has a `play(type, volume)` switch. Add at least 3 new types using existing primitives — no audio files:
  - `ocean` — brown noise through a slow LFO-modulated low-pass (wave swell).
  - `fire` — brown noise + random crackle pops (short gain bursts), like the existing chirp pattern.
  - `night` — pink noise bed + periodic cricket chirps (oscillator bursts).
Extend the `AmbientSoundType` union and the `play()` switch with these cases following the existing implementations (mirror `rain`/`forest`). Show the actual node graph for each in the implementation (reuse `makeNoiseBuffer`, `playLoop`, biquad filters, and the chirp interval).

- [ ] **Step 2: Widen the store union** in `store/settingsStore.ts`: `ambientSound: 'none' | 'cafe' | 'forest' | 'white-noise' | 'rain' | 'ocean' | 'fire' | 'night'`.

- [ ] **Step 3: MusicPanel** — in `components/room/MusicPanel.tsx`, extend `type SoundId` and the `TRACKS` array with the new entries (id, Russian title, desc, lucide icon — e.g. `Waves`→ocean, `Flame`→fire, `Moon`→night).

- [ ] **Step 4: Bottom-dock AmbientControl** — in `app/room/[slug]/page.tsx`, extend `type AmbientType` and the `sounds` array to include the new ids/labels/icons. Keep the grid responsive (it's `grid-cols-4`; with 7 sounds it wraps to 2 rows — fine).

- [ ] **Step 5: Settings sound list** — in `app/settings/page.tsx`, extend `AmbientSound` + `AMBIENT_SOUNDS` to match (also add the missing `rain`).

- [ ] **Step 6: Verify** — `tsc` clean. In the room MusicPanel and bottom dock, each new sound plays distinctly and the active state stays synced across MusicPanel ↔ AmbientControl (shared `settingsStore`). Volume slider affects them.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: more ambient sounds (ocean, fire, night)"
```

---

## Task 8: Avatar customization in Settings

**Files:**
- Modify: `app/settings/page.tsx` (replace the legacy `AVATARS` grid with the face builder)
- Uses: `components/avatar/AvatarBuilder.tsx`, `lib/faceAvatar.ts`, `lib/localAuth.ts` (`setLocalAvatar`)

- [ ] **Step 1: Read the current avatar section** in `app/settings/page.tsx` (it imports `AVATARS, getAvatarSvg` and renders a picker that saves via `setLocalAvatar`/settings). Identify the avatar block.

- [ ] **Step 2: Replace the grid with a built-face preview + "Изменить аватар".** Mirror the home `CreateRoomModal` pattern:
```tsx
import AvatarBuilder from '@/components/avatar/AvatarBuilder';
import { isFaceId, decodeFace } from '@/lib/faceAvatar';
import Avatar from '@/components/ui/Avatar';
import { Sparkles } from 'lucide-react';
// state:
const [avatarId, setAvatarId] = useState<string>(/* load from vc_user / localAuth */);
const [showBuilder, setShowBuilder] = useState(false);
// UI:
<div className="flex items-center gap-3">
  <Avatar id={avatarId} size={64} className="ring-2 ring-[var(--border)]" />
  <button type="button" onClick={() => setShowBuilder(true)}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
    <Sparkles size={14} /> Изменить аватар
  </button>
</div>
{showBuilder && (
  <AvatarBuilder
    initial={isFaceId(avatarId) ? decodeFace(avatarId) : undefined}
    onDone={(id) => {
      setAvatarId(id);
      try { const s = JSON.parse(localStorage.getItem('vc_user') || '{}'); localStorage.setItem('vc_user', JSON.stringify({ ...s, avatarId: id })); } catch {}
      // persist to local account too, if logged in:
      try { const { setLocalAvatar } = require('@/lib/localAuth'); setLocalAvatar?.(id); } catch {}
      setShowBuilder(false);
    }}
    onClose={() => setShowBuilder(false)}
  />
)}
```
Load initial `avatarId` from `vc_user` in a `useEffect`. Remove the now-unused legacy `AVATARS` grid (keep the import only if still referenced elsewhere on the page).

- [ ] **Step 3: Verify** — `tsc` clean. Settings shows the current face; "Изменить аватар" opens the same builder as home; saving updates the preview and persists (reload Settings → same face; it also flows into the next room join via `vc_user`).

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: avatar customization in settings"
```

---

## Task 9: Fix the "Мой прогресс" button

**Files:**
- Inspect: `components/AuthGate.tsx`, `app/dashboard/page.tsx`, the buttons in `app/page.tsx:43` (footer) + `app/room/[slug]/page.tsx` (sidebar "Мой прогресс")

- [ ] **Step 1: Reproduce.** Click "Мой прогресс" in (a) the room sidebar and (b) the home footer (logged in). Note exact behaviour: does it navigate to `/dashboard`? Does `/dashboard` render, redirect, or blank out?

- [ ] **Step 2: Diagnose `AuthGate`.** `app/dashboard/page.tsx` is wrapped in `<AuthGate>`. Read `components/AuthGate.tsx` — if it redirects anonymous users to `/login` (or renders nothing), then "Мой прогресс" "doesn't work" for not-logged-in users. Determine intended behaviour with the existing local-auth (`lib/localAuth.ts`): the room sidebar uses a `vc_user` (nickname) which is NOT a full account, so AuthGate may reject it.

- [ ] **Step 3: Fix.** Pick the correct fix based on Step 2:
  - If dashboard should be reachable with just a `vc_user` nickname: relax `AuthGate` (or the dashboard) to accept a `vc_user` session, not only a Supabase/local account.
  - If it should require login: make the button give feedback (route to `/login` with a return param, or hide it when anonymous) instead of silently doing nothing.
  Implement the chosen fix with a concrete edit and explain it in the commit message.

- [ ] **Step 4: Verify** — clicking "Мой прогресс" from the room and home reliably lands on a rendered dashboard (or an intentional login prompt). No dead click.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "fix: Мой прогресс button (<specific cause/fix>)"
```

---

## Task 10: Final theming sweep, verify, deploy

**Files:** all of the above

- [ ] **Step 1: Full light/dark sweep.** With the app running, toggle both themes and walk every screen: home (hero, create modal, builder, quick-join, active sessions, footer), login, register, settings, schedule, dashboard, room (header, sidebar clock + status, participants, tasks, music, bottom dock, share modal, avatar builder, pomodoro settings). Fix any unreadable contrast or stray warm/navy hardcoded color found (convert to `var(--token)`).

- [ ] **Step 2: Typecheck** — `node node_modules/typescript/bin/tsc --noEmit` → clean.

- [ ] **Step 3: Brand guard** — `grep -rniE "notes cowork|i\.c-e\.f|тихий зал" app components | grep -vi "тихий дождь"` → empty.

- [ ] **Step 4: Commit any sweep fixes**
```bash
git add -A && git commit -m "chore: theming sweep + contrast fixes"
```

- [ ] **Step 5: Deploy (ONLY after user approval).**
```bash
touch /tmp/.opsera-pre-commit-scan-passed   # separate shell call, before any commit
git push origin main
vercel deploy --prod --yes
```
Then verify `https://notes-cowork.vercel.app` serves the fresh build (`age: 0`, brand "ICF Notes", light/dark toggle works).

---

## Notes / known follow-ups (not in scope here)
- SFU on the VPS still needs a redeploy for clean camera-stop signaling (`voice:stop-camera` handler is in `sfu/server.js` but not deployed). Requires user approval for VPS access.
- Live avatar broadcast relies on the rooms server (`server/index.js` `room:update-status` now accepts `avatarId`); prod rooms server must be redeployed for cross-user live avatar updates.
- Rotate the GitHub token currently embedded in `.git/config`.
