import type { Entry } from '@/types';

interface AnthologyBadgesProps {
  entry: Pick<Entry, 'anthologyName' | 'anthologySeason'>;
  className?: string;
}

export default function AnthologyBadges({ entry, className = '' }: AnthologyBadgesProps) {
  if (!entry.anthologyName) return null;

  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`.trim()}>
      <span className="inline-flex rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-[#B3B3B3]">
        Anthology: {entry.anthologyName}
      </span>
      {entry.anthologySeason != null && entry.anthologySeason > 0 && (
        <span className="inline-flex rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-[#B3B3B3]">
          Season {entry.anthologySeason}
        </span>
      )}
    </span>
  );
}
