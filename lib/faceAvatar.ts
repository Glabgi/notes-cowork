/**
 * Layered-SVG "Sims-style" face avatars.
 *
 * A built face is serialised into the SAME `avatarId` string that flows through
 * the whole app (sockets, room store, localStorage) — just prefixed with
 * `face:` + base64(JSON). Legacy ids ('fox', 'cat', …) keep working; anything
 * starting with `face:` is rendered by renderFace().
 */

export type Gender = 'fem' | 'masc' | 'neutral';

export interface FaceConfig {
  skin: string;        // hex
  hair: string;        // style id
  hairColor: string;   // hex
  brows: string;       // style id
  eyes: string;        // style id
  eyeColor: string;    // hex
  mouth: string;       // style id
  glasses: string;     // style id ('none' = off)
  clothes: string;     // style id
  clothesColor: string;// hex
  bg: string;          // hex
  gender: Gender;
}

/* ── palettes ──────────────────────────────────────────────────────────── */
export const SKIN          = ['#f8d9c0', '#f0c19b', '#e0a878', '#c68642', '#8d5524', '#5c3a21'];
export const HAIR_COLORS   = ['#2a2018', '#6b4423', '#b5733a', '#d9a441', '#9aa0a6', '#c4555a', '#4a8a78'];
export const EYE_COLORS    = ['#5b3a1e', '#3a6ea5', '#4a8a78', '#7a6045', '#2a2018', '#8a8f98'];
export const CLOTHES_COLORS= ['#c4784a', '#4a8a78', '#7a6a55', '#3a6ea5', '#c4555a', '#2a2018', '#d9a441'];
export const BG_COLORS     = ['#f0e8da', '#e8dcc8', '#d8e3dd', '#e3dce8', '#f0dcda', '#dde3ec'];

export const HAIR_STYLES    = ['none', 'short', 'buzz', 'bun', 'long', 'curly', 'mohawk'];
export const BROW_STYLES    = ['default', 'thick', 'thin', 'angry'];
export const EYE_STYLES     = ['round', 'almond', 'wide', 'sleepy'];
export const MOUTH_STYLES   = ['smile', 'neutral', 'grin', 'small'];
export const GLASSES_STYLES = ['none', 'round', 'square', 'sun'];
export const CLOTHES_STYLES = ['tshirt', 'hoodie', 'sweater', 'collar', 'dress'];

export const DEFAULT_FACE: FaceConfig = {
  skin: SKIN[1], hair: 'short', hairColor: HAIR_COLORS[1], brows: 'default',
  eyes: 'round', eyeColor: EYE_COLORS[0], mouth: 'smile', glasses: 'none',
  clothes: 'tshirt', clothesColor: CLOTHES_COLORS[0], bg: BG_COLORS[0], gender: 'neutral',
};

/* ── encode / decode (rides inside avatarId) ───────────────────────────── */
export function isFaceId(id?: string | null): boolean {
  return !!id && typeof id === 'string' && id.startsWith('face:');
}

export function encodeFace(cfg: FaceConfig): string {
  try {
    const json = JSON.stringify(cfg);
    const b64 = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf-8').toString('base64');
    return 'face:' + b64;
  } catch {
    return 'face:';
  }
}

export function decodeFace(id: string): FaceConfig {
  try {
    const b64 = id.slice(5);
    const json = typeof atob !== 'undefined'
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, 'base64').toString('utf-8');
    return { ...DEFAULT_FACE, ...JSON.parse(json) };
  } catch {
    return DEFAULT_FACE;
  }
}

export function randomFace(): FaceConfig {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const gender = pick<Gender>(['fem', 'masc', 'neutral']);
  return {
    skin: pick(SKIN),
    hair: pick(gender === 'masc' ? ['short', 'buzz', 'mohawk', 'curly'] : HAIR_STYLES.filter(h => h !== 'none')),
    hairColor: pick(HAIR_COLORS),
    brows: pick(BROW_STYLES),
    eyes: pick(EYE_STYLES),
    eyeColor: pick(EYE_COLORS),
    mouth: pick(MOUTH_STYLES),
    glasses: pick(GLASSES_STYLES),
    clothes: pick(CLOTHES_STYLES),
    clothesColor: pick(CLOTHES_COLORS),
    bg: pick(BG_COLORS),
    gender,
  };
}

/* ── colour helper ─────────────────────────────────────────────────────── */
function shade(hex: string, amt: number): string {
  try {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch { return hex; }
}

/* ── layers ────────────────────────────────────────────────────────────── */
function clothes(c: FaceConfig): string {
  const col = c.clothesColor; const dark = shade(col, -16);
  const base = `<path d="M18 100 Q18 80 38 76 L50 85 L62 76 Q82 80 82 100 Z" fill="${col}"/>`;
  switch (c.clothes) {
    case 'hoodie':
      return base +
        `<path d="M38 76 L50 85 L62 76 L58 92 L42 92 Z" fill="${dark}"/>` +
        `<circle cx="45" cy="94" r="1.4" fill="${dark}"/><circle cx="55" cy="94" r="1.4" fill="${dark}"/>`;
    case 'collar':
      return base + `<path d="M43 77 L50 87 L57 77 L50 81 Z" fill="#ffffff"/>`;
    case 'sweater':
      return base + `<path d="M20 91 Q50 87 80 91" stroke="${dark}" stroke-width="2" fill="none"/>`;
    case 'dress':
      return `<path d="M14 100 Q22 78 38 76 L50 85 L62 76 Q78 78 86 100 Z" fill="${col}"/>`;
    default:
      return base; // tshirt
  }
}

function hairBack(c: FaceConfig): string {
  const hd = shade(c.hairColor, -20);
  if (c.hair === 'long')
    return `<path d="M23 44 Q20 80 31 84 L36 60 Q27 56 29 40 Z" fill="${hd}"/>` +
           `<path d="M77 44 Q80 80 69 84 L64 60 Q73 56 71 40 Z" fill="${hd}"/>`;
  if (c.hair === 'curly')
    return `<circle cx="26" cy="58" r="8" fill="${hd}"/><circle cx="74" cy="58" r="8" fill="${hd}"/>`;
  return '';
}

function head(c: FaceConfig): string {
  return `<circle cx="29" cy="49" r="6" fill="${c.skin}"/>` +
         `<circle cx="71" cy="49" r="6" fill="${c.skin}"/>` +
         `<ellipse cx="50" cy="46" rx="24" ry="27" fill="${c.skin}"/>`;
}

function brows(c: FaceConfig): string {
  const col = shade(c.hairColor, -10);
  const map: Record<string, [string, string]> = {
    default: ['M32 37 Q38 34 44 37', 'M56 37 Q62 34 68 37'],
    thick:   ['M32 37 Q38 33 44 37', 'M56 37 Q62 33 68 37'],
    thin:    ['M33 37 Q38 35.5 43 37', 'M57 37 Q62 35.5 67 37'],
    angry:   ['M32 35 L44 38', 'M68 35 L56 38'],
  };
  const [l, r] = map[c.brows] || map.default;
  const sw = c.brows === 'thick' ? 3.2 : c.brows === 'thin' ? 1.6 : 2.4;
  return `<path d="${l}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
         `<path d="${r}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
}

function oneEye(x: number, c: FaceConfig): string {
  const ry = c.eyes === 'wide' ? 7 : c.eyes === 'sleepy' ? 3.5 : 6;
  const rx = c.eyes === 'almond' ? 7 : 6;
  return `<ellipse cx="${x}" cy="46" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="#d8c9b8" stroke-width="0.6"/>` +
         `<circle cx="${x}" cy="46" r="3.1" fill="${c.eyeColor}"/>` +
         `<circle cx="${x}" cy="46" r="1.5" fill="#241c14"/>` +
         `<circle cx="${x - 1}" cy="44.7" r="0.8" fill="#ffffff"/>`;
}

function eyes(c: FaceConfig): string {
  if (c.eyes === 'sleepy')
    return `<path d="M32 46 Q38 49 44 46" stroke="#241c14" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
           `<path d="M56 46 Q62 49 68 46" stroke="#241c14" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  return oneEye(38, c) + oneEye(62, c);
}

function nose(c: FaceConfig): string {
  return `<path d="M50 47 L47.5 53 Q50 55 52.5 53" stroke="${shade(c.skin, -28)}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function mouth(c: FaceConfig): string {
  if (c.mouth === 'grin')
    return `<path d="M42 58 Q50 66 58 58 Q50 61 42 58 Z" fill="#ffffff" stroke="#c46a5a" stroke-width="1.2" stroke-linejoin="round"/>`;
  const map: Record<string, string> = {
    smile: 'M42 59 Q50 65 58 59',
    neutral: 'M43 60 L57 60',
    small: 'M46 60 Q50 62 54 60',
  };
  return `<path d="${map[c.mouth] || map.smile}" stroke="#b5604f" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

function hairFront(c: FaceConfig): string {
  const h = c.hairColor;
  switch (c.hair) {
    case 'none': return '';
    case 'buzz': return `<path d="M26 41 Q28 21 50 19 Q72 21 74 41 Q66 31 50 31 Q34 31 26 41 Z" fill="${h}" opacity="0.92"/>`;
    case 'short': return `<path d="M26 43 Q24 16 50 15 Q76 16 74 43 Q72 29 60 27 Q57 33 50 33 Q43 33 40 27 Q28 29 26 43 Z" fill="${h}"/>`;
    case 'bun': return `<circle cx="50" cy="13" r="8" fill="${h}"/><path d="M26 43 Q24 18 50 17 Q76 18 74 43 Q70 29 50 29 Q30 29 26 43 Z" fill="${h}"/>`;
    case 'long': return `<path d="M24 47 Q21 15 50 13 Q79 15 76 47 Q74 30 64 27 L61 24 Q50 31 39 24 L36 27 Q26 30 24 47 Z" fill="${h}"/>`;
    case 'curly': return `<g fill="${h}"><circle cx="34" cy="22" r="9"/><circle cx="50" cy="16" r="10"/><circle cx="66" cy="22" r="9"/><circle cx="28" cy="34" r="8"/><circle cx="72" cy="34" r="8"/></g>`;
    case 'mohawk': return `<path d="M44 6 Q50 1 56 6 L54 34 Q50 29 46 34 Z" fill="${h}"/>`;
    default: return '';
  }
}

function glasses(c: FaceConfig): string {
  if (c.glasses === 'none') return '';
  if (c.glasses === 'sun')
    return `<rect x="29" y="40" width="17" height="11" rx="3" fill="#241c14"/>` +
           `<rect x="54" y="40" width="17" height="11" rx="3" fill="#241c14"/>` +
           `<path d="M46 44 L54 44" stroke="#241c14" stroke-width="2"/>`;
  const lens = c.glasses === 'square'
    ? `<rect x="30" y="40" width="16" height="12" rx="2" fill="none" stroke="#241c14" stroke-width="2"/>` +
      `<rect x="54" y="40" width="16" height="12" rx="2" fill="none" stroke="#241c14" stroke-width="2"/>`
    : `<circle cx="38" cy="46" r="8" fill="none" stroke="#241c14" stroke-width="2"/>` +
      `<circle cx="62" cy="46" r="8" fill="none" stroke="#241c14" stroke-width="2"/>`;
  return lens + `<path d="M46 46 L54 46" stroke="#241c14" stroke-width="2"/>`;
}

/* ── compositor ────────────────────────────────────────────────────────── */
export function renderFace(cfg: Partial<FaceConfig>, size = 40): string {
  const c: FaceConfig = { ...DEFAULT_FACE, ...cfg };
  const inner =
    `<rect width="100" height="100" fill="${c.bg}"/>` +
    clothes(c) +
    `<rect x="44" y="63" width="12" height="14" rx="4" fill="${shade(c.skin, -16)}"/>` + // neck
    hairBack(c) +
    head(c) +
    brows(c) +
    eyes(c) +
    nose(c) +
    mouth(c) +
    hairFront(c) +
    glasses(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${inner}</svg>`;
}
