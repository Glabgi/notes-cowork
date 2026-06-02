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
    focus:   'ring-[#5b8cff]',
    break:   'ring-[#4cc2a8]',
    away:    'ring-[#475069]',
  };

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex-shrink-0',
        showRing && status && `ring-2 ring-offset-2 ring-offset-white ${statusRings[status] || 'ring-[#ddd2c2]'}`,
        className
      )}
      style={{ width: size, height: size, background: color + '22' }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
