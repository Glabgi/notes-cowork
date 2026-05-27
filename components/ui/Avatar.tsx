'use client';

import { getAvatarSvg, getAvatarColor } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface AvatarProps {
  id: string;
  size?: number;
  className?: string;
  showRing?: boolean;
  status?: string;
}

export default function Avatar({ id, size = 40, className, showRing, status }: AvatarProps) {
  const svgString = getAvatarSvg(id, size);
  const color = getAvatarColor(id);

  const statusRings: Record<string, string> = {
    focus:   'ring-[#16A34A]',
    break:   'ring-[#D97706]',
    gaming:  'ring-[#7C3AED]',
    away:    'ring-[#CBD5E1]',
  };

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex-shrink-0',
        showRing && status && `ring-2 ring-offset-2 ring-offset-white ${statusRings[status] || 'ring-[#CBD5E1]'}`,
        className
      )}
      style={{ width: size, height: size, background: color + '22' }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
