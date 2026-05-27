export interface AvatarDef {
  id: string;
  label: string;
  color: string;
  svg: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'fox', label: 'Лис', color: '#F97316', svg: 'fox' },
  { id: 'cat', label: 'Кот', color: '#8B5CF6', svg: 'cat' },
  { id: 'bear', label: 'Медведь', color: '#A16207', svg: 'bear' },
  { id: 'owl', label: 'Сова', color: '#4F46E5', svg: 'owl' },
  { id: 'panda', label: 'Панда', color: '#1F2937', svg: 'panda' },
  { id: 'bunny', label: 'Кролик', color: '#EC4899', svg: 'bunny' },
  { id: 'dragon', label: 'Дракон', color: '#10B981', svg: 'dragon' },
  { id: 'robot', label: 'Робот', color: '#3B82F6', svg: 'robot' },
  { id: 'alien', label: 'Пришелец', color: '#84CC16', svg: 'alien' },
  { id: 'wizard', label: 'Волшебник', color: '#7C3AED', svg: 'wizard' },
  { id: 'ninja', label: 'Ниндзя', color: '#374151', svg: 'ninja' },
  { id: 'pirate', label: 'Пират', color: '#DC2626', svg: 'pirate' },
  { id: 'astronaut', label: 'Астронавт', color: '#0EA5E9', svg: 'astronaut' },
  { id: 'chef', label: 'Шеф', color: '#D97706', svg: 'chef' },
  { id: 'coder', label: 'Кодер', color: '#059669', svg: 'coder' },
];

// Generate simple but distinctive SVG avatars
export function getAvatarSvg(id: string, size = 40): string {
  const avatar = AVATARS.find(a => a.id === id) || AVATARS[0];
  const shapes: Record<string, string> = {
    fox: `<circle cx="20" cy="18" r="10" fill="${avatar.color}"/><polygon points="12,10 16,2 20,10" fill="${avatar.color}"/><polygon points="28,10 24,2 20,10" fill="${avatar.color}"/><circle cx="16" cy="17" r="2" fill="white"/><circle cx="24" cy="17" r="2" fill="white"/><ellipse cx="20" cy="21" rx="4" ry="2" fill="#FEA57A"/>`,
    cat: `<circle cx="20" cy="20" r="12" fill="${avatar.color}"/><polygon points="10,12 13,4 16,12" fill="${avatar.color}"/><polygon points="24,12 27,4 30,12" fill="${avatar.color}"/><circle cx="16" cy="19" r="2" fill="white"/><circle cx="24" cy="19" r="2" fill="white"/><path d="M18,23 Q20,25 22,23" stroke="white" stroke-width="1.5" fill="none"/>`,
    bear: `<circle cx="20" cy="20" r="12" fill="${avatar.color}"/><circle cx="13" cy="12" r="5" fill="${avatar.color}"/><circle cx="27" cy="12" r="5" fill="${avatar.color}"/><circle cx="16" cy="19" r="2" fill="white"/><circle cx="24" cy="19" r="2" fill="white"/><ellipse cx="20" cy="23" rx="4" ry="3" fill="#D4A574"/>`,
    owl: `<ellipse cx="20" cy="21" rx="11" ry="12" fill="${avatar.color}"/><circle cx="16" cy="19" r="5" fill="white"/><circle cx="24" cy="19" r="5" fill="white"/><circle cx="16" cy="19" r="3" fill="#1F2937"/><circle cx="24" cy="19" r="3" fill="#1F2937"/><polygon points="18,23 20,26 22,23" fill="#F59E0B"/>`,
    panda: `<circle cx="20" cy="20" r="12" fill="white"/><circle cx="12" cy="13" r="6" fill="${avatar.color}"/><circle cx="28" cy="13" r="6" fill="${avatar.color}"/><ellipse cx="15" cy="19" rx="4" ry="3" fill="${avatar.color}"/><ellipse cx="25" cy="19" rx="4" ry="3" fill="${avatar.color}"/><circle cx="15" cy="19" r="1.5" fill="white"/><circle cx="25" cy="19" r="1.5" fill="white"/>`,
    bunny: `<circle cx="20" cy="22" r="10" fill="${avatar.color}"/><ellipse cx="14" cy="10" rx="4" ry="8" fill="${avatar.color}"/><ellipse cx="26" cy="10" rx="4" ry="8" fill="${avatar.color}"/><ellipse cx="14" cy="10" rx="2" ry="5" fill="#FCE7F3"/><ellipse cx="26" cy="10" rx="2" ry="5" fill="#FCE7F3"/><circle cx="17" cy="21" r="1.5" fill="white"/><circle cx="23" cy="21" r="1.5" fill="white"/>`,
    dragon: `<circle cx="20" cy="20" r="11" fill="${avatar.color}"/><polygon points="14,10 11,3 18,9" fill="${avatar.color}"/><polygon points="26,10 29,3 22,9" fill="${avatar.color}"/><circle cx="16" cy="18" r="2.5" fill="#FBBF24"/><circle cx="24" cy="18" r="2.5" fill="#FBBF24"/><path d="M16,24 Q20,27 24,24" stroke="white" stroke-width="2" fill="none"/>`,
    robot: `<rect x="10" y="14" width="20" height="16" rx="3" fill="${avatar.color}"/><rect x="8" y="10" width="24" height="8" rx="4" fill="${avatar.color}"/><rect x="12" y="12" width="6" height="4" rx="1" fill="#60A5FA"/><rect x="22" y="12" width="6" height="4" rx="1" fill="#60A5FA"/><rect x="14" y="22" width="12" height="3" rx="1" fill="#1E3A5F"/>`,
    alien: `<ellipse cx="20" cy="21" rx="11" ry="12" fill="${avatar.color}"/><ellipse cx="20" cy="14" rx="10" ry="7" fill="${avatar.color}"/><ellipse cx="14" cy="19" rx="4" ry="5" fill="#065F46"/><ellipse cx="26" cy="19" rx="4" ry="5" fill="#065F46"/><circle cx="14" cy="19" r="2" fill="black"/><circle cx="26" cy="19" r="2" fill="black"/>`,
    wizard: `<circle cx="20" cy="22" r="11" fill="${avatar.color}"/><circle cx="17" cy="20" r="2" fill="white"/><circle cx="23" cy="20" r="2" fill="white"/><path d="M17,25 Q20,28 23,25" stroke="white" stroke-width="1.5" fill="none"/><polygon points="20,2 14,14 26,14" fill="#4C1D95"/><circle cx="20" cy="2" r="2" fill="#F59E0B"/>`,
    ninja: `<circle cx="20" cy="20" r="12" fill="${avatar.color}"/><rect x="9" y="17" width="22" height="6" fill="#111827"/><circle cx="16" cy="18" r="2" fill="white"/><circle cx="24" cy="18" r="2" fill="white"/>`,
    pirate: `<circle cx="20" cy="21" r="11" fill="${avatar.color}"/><circle cx="16" cy="19" r="2" fill="white"/><circle cx="24" cy="19" r="2" fill="white"/><path d="M17,25 Q20,27 23,25" stroke="white" stroke-width="1.5" fill="none"/><rect x="9" y="10" width="22" height="4" rx="1" fill="#111827"/><line x1="9" y1="10" x2="31" y2="14" stroke="white" stroke-width="2"/>`,
    astronaut: `<circle cx="20" cy="20" r="12" fill="white"/><circle cx="20" cy="20" r="9" fill="${avatar.color}"/><circle cx="16" cy="18" r="2" fill="white"/><circle cx="24" cy="18" r="2" fill="white"/><ellipse cx="20" cy="24" rx="4" ry="2" fill="white" opacity="0.5"/><rect x="8" y="13" width="24" height="14" rx="8" fill="none" stroke="white" stroke-width="2"/>`,
    chef: `<circle cx="20" cy="22" r="10" fill="${avatar.color}"/><ellipse cx="20" cy="14" rx="8" ry="10" fill="white"/><circle cx="16" cy="21" r="2" fill="white"/><circle cx="24" cy="21" r="2" fill="white"/><path d="M17,26 Q20,28 23,26" stroke="white" stroke-width="1.5" fill="none"/>`,
    coder: `<rect x="8" y="8" width="24" height="24" rx="4" fill="${avatar.color}"/><text x="20" y="24" text-anchor="middle" fill="white" font-size="12" font-family="monospace">&lt;/&gt;</text>`,
  };

  const svgContent = shapes[id] || shapes.fox;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">${svgContent}</svg>`;
}

export function getAvatarColor(id: string): string {
  return AVATARS.find(a => a.id === id)?.color || '#6B7280';
}
