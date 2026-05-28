'use client';

// Lightweight local account system used when Supabase is not configured.
// Stores accounts in localStorage. Login + password only, no personal data,
// no password reset (matches product requirement). Per-device by design.

const ACCOUNTS_KEY = 'vc_accounts';     // { [username]: { hash, avatarId, createdAt } }
const SESSION_KEY  = 'vc_session';      // current logged-in username

export type LocalProfile = { username: string; avatar_id: string };

async function hash(password: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(password + '::notes-cowork-salt');
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback (non-secure) if subtle crypto unavailable
    let h = 0; const s = password + '::salt';
    for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return 'fb' + Math.abs(h).toString(16);
  }
}

function readAccounts(): Record<string, { hash: string; avatarId: string; createdAt: number }> {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); } catch { return {}; }
}
function writeAccounts(a: Record<string, any>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
}

export async function localRegister(username: string, password: string, avatarId = 'fox'): Promise<{ ok: boolean; error?: string }> {
  const u = username.trim().toLowerCase();
  if (u.length < 3) return { ok: false, error: 'Логин минимум 3 символа' };
  if (password.length < 6) return { ok: false, error: 'Пароль минимум 6 символов' };
  const accounts = readAccounts();
  if (accounts[u]) return { ok: false, error: 'Этот логин уже занят' };
  accounts[u] = { hash: await hash(password), avatarId, createdAt: Date.now() };
  writeAccounts(accounts);
  localStorage.setItem(SESSION_KEY, u);
  return { ok: true };
}

export async function localLogin(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const u = username.trim().toLowerCase();
  const accounts = readAccounts();
  const acc = accounts[u];
  if (!acc) return { ok: false, error: 'Аккаунт не найден' };
  if (acc.hash !== await hash(password)) return { ok: false, error: 'Неверный пароль' };
  localStorage.setItem(SESSION_KEY, u);
  return { ok: true };
}

export function localLogout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getLocalSession(): LocalProfile | null {
  try {
    const u = localStorage.getItem(SESSION_KEY);
    if (!u) return null;
    const acc = readAccounts()[u];
    return { username: u, avatar_id: acc?.avatarId || 'fox' };
  } catch { return null; }
}

export function setLocalAvatar(avatarId: string) {
  try {
    const u = localStorage.getItem(SESSION_KEY);
    if (!u) return;
    const accounts = readAccounts();
    if (accounts[u]) { accounts[u].avatarId = avatarId; writeAccounts(accounts); }
  } catch {}
}
