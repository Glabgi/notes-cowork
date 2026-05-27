import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  !!supabaseUrl && !!supabaseAnonKey &&
  /^https:\/\/.+\.supabase\.co/.test(supabaseUrl) &&
  !supabaseUrl.includes('your_supabase') && !supabaseAnonKey.includes('your_supabase');

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  if (isSupabaseConfigured) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } else {
    // Stub client: returns no-ops so app pages render without Supabase configured
    const stub: any = new Proxy({}, {
      get: () => () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    });
    stub.auth = {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser:    () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp:     () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut:    () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    };
    _client = stub as SupabaseClient;
  }
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getClient() as any;
    const val = c[prop];
    return typeof val === 'function' ? val.bind(c) : val;
  },
});

/* ─── AUTH ──────────────────────────────────────────────────────────────── */

// Supabase requires email format — we synthesize one from the username
// so the user only sees "Login + Password" UX. The "@" makes it valid; the
// domain is non-routable so password reset is impossible by design.
const SYNTH_DOMAIN = 'notes-cowork.local';
const usernameToEmail = (u: string) => `${u.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@${SYNTH_DOMAIN}`;

export async function signUp(params: { username: string; password: string; avatarId?: string }) {
  const { username, password, avatarId } = params;
  return supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username: username.trim(), avatar_id: avatarId || 'fox' } },
  });
}

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_id')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

/* ─── POMODORO TRACKING ─────────────────────────────────────────────────── */

export async function recordPomodoro(minutes: number, phase: 'focus' | 'shortBreak' | 'longBreak', roomSlug?: string) {
  if (!isSupabaseConfigured) return;
  return supabase.rpc('record_pomodoro', {
    _minutes: minutes,
    _phase: phase === 'focus' ? 'focus' : 'break',
    _room: roomSlug || null,
  });
}

export async function getUserSessions(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('id, duration_minutes, phase, room_slug, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function getUserStats(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, focus_minutes, pomodoro_count, tasks_completed')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');
  if (error) return [];
  return data;
}

/* ─── TASKS ─────────────────────────────────────────────────────────────── */

export async function syncTask(task: {
  id: string; user_id: string; title: string; completed: boolean; is_public: boolean;
  tag: string; pomodoro_count: number; estimated_pomodoros?: number;
  created_at: string; completed_at?: string | null; order_index: number;
}) {
  return supabase.from('tasks').upsert(task).select().single();
}

export async function getUserTasks(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('order_index');
  if (error) return [];
  return data;
}

export async function deleteTask(taskId: string) {
  return supabase.from('tasks').delete().eq('id', taskId);
}
