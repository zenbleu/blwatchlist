import type { GenreTag } from '@/types';

interface GenreChipProps {
  tag: GenreTag;
  size?: 'small' | 'regular';
  onRemove?: () => void;
}

export default function GenreChip({ tag, size = 'small', onRemove }: GenreChipProps) {
  const style = {
    color: tag.color,
    borderColor: `color-mix(in srgb, ${tag.color} 48%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)`,
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium leading-none ${
        size === 'regular' ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'
      }`}
      style={style}
      title={tag.name}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${tag.name}`}
          onClick={onRemove}
          className="ml-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
