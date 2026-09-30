import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface ActorPhotoCropDialogProps {
  imageSrc: string | null;
  onCancel: () => void;
  onApply: (photo: string) => void;
}

interface Point {
  x: number;
  y: number;
}

const OUTPUT_SIZE = 512;

function clampOffset(offset: Point, frameSize: number, imageWidth: number, imageHeight: number): Point {
  return {
    x: Math.min(0, Math.max(frameSize - imageWidth, offset.x)),
    y: Math.min(0, Math.max(frameSize - imageHeight, offset.y)),
  };
}

export default function ActorPhotoCropDialog({ imageSrc, onCancel, onApply }: ActorPhotoCropDialogProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; start: Point; offset: Point } | null>(null);
  const frameSizeRef = useRef(0);
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(null);
  const initialOffsetSetRef = useRef(false);
  const [frameSize, setFrameSize] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (!imageSrc) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      const size = entry.contentRect.width;
      frameSizeRef.current = size;
      setFrameSize(size);
      const imageSize = naturalSizeRef.current;
      if (imageSize && !initialOffsetSetRef.current) {
        const scale = Math.max(size / imageSize.width, size / imageSize.height);
        setOffset({
          x: (size - imageSize.width * scale) / 2,
          y: (size - imageSize.height * scale) / 2,
        });
        initialOffsetSetRef.current = true;
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [imageSrc]);

  const baseScale = naturalSize && frameSize
    ? Math.max(frameSize / naturalSize.width, frameSize / naturalSize.height)
    : 0;
  const imageWidth = naturalSize ? naturalSize.width * baseScale * zoom : 0;
  const imageHeight = naturalSize ? naturalSize.height * baseScale * zoom : 0;

  const handleImageLoad = (image: HTMLImageElement) => {
    const imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    naturalSizeRef.current = imageSize;
    setNaturalSize(imageSize);
    setZoom(1);
    const size = frameSizeRef.current;
    if (size && !initialOffsetSetRef.current) {
      const scale = Math.max(size / imageSize.width, size / imageSize.height);
      setOffset({
        x: (size - imageSize.width * scale) / 2,
        y: (size - imageSize.height * scale) / 2,
      });
      initialOffsetSetRef.current = true;
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!naturalSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      offset,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const moved = clampOffset({
      x: drag.offset.x + event.clientX - drag.start.x,
      y: drag.offset.y + event.clientY - drag.start.y,
    }, frameSize, imageWidth, imageHeight);
    setOffset(moved);
  };

  const updateZoom = (nextZoom: number) => {
    const center = frameSize / 2;
    const ratio = nextZoom / zoom;
    setOffset(clampOffset({
      x: center - (center - offset.x) * ratio,
      y: center - (center - offset.y) * ratio,
    }, frameSize, imageWidth * ratio, imageHeight * ratio));
    setZoom(nextZoom);
  };

  const nudge = (x: number, y: number) => {
    setOffset((current) => clampOffset({
      x: current.x + x,
      y: current.y + y,
    }, frameSize, imageWidth, imageHeight));
  };

  const applyCrop = () => {
    const image = viewportRef.current?.querySelector('img');
    if (!image || !naturalSize || !baseScale || !frameSize) return;

    const sourceSize = frameSize / (baseScale * zoom);
    const sourceX = Math.min(naturalSize.width - sourceSize, Math.max(0, -offset.x / (baseScale * zoom)));
    const sourceY = Math.min(naturalSize.height - sourceSize, Math.max(0, -offset.y / (baseScale * zoom)));
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onApply(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <Dialog open={Boolean(imageSrc)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101010] text-white sm:max-w-md">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#E50914]">Actor photo</p>
          <DialogTitle className="mt-1 text-xl font-bold">Crop photo</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#999]">Drag to position the photo inside the square.</DialogDescription>
        </div>

        <div className="flex justify-center">
          <div
            ref={viewportRef}
            role="application"
            aria-label="Square photo crop area. Drag the photo or use the arrow keys to position it."
            tabIndex={0}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={(event) => {
              const amount = event.shiftKey ? 20 : 5;
              if (event.key === 'ArrowLeft') nudge(-amount, 0);
              else if (event.key === 'ArrowRight') nudge(amount, 0);
              else if (event.key === 'ArrowUp') nudge(0, -amount);
              else if (event.key === 'ArrowDown') nudge(0, amount);
              else return;
              event.preventDefault();
            }}
            className="relative aspect-square w-[min(72vw,320px)] touch-none overflow-hidden rounded-lg bg-[#080808] outline-none ring-1 ring-white/20 focus-visible:ring-2 focus-visible:ring-[#E50914]"
            style={{ cursor: naturalSize ? 'grab' : 'default' }}
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Photo crop preview"
                draggable={false}
                onLoad={(event) => handleImageLoad(event.currentTarget)}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  left: offset.x,
                  top: offset.y,
                }}
              />
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 border border-white/70" />
          </div>
        </div>

        <label className="block text-xs font-medium text-[#B3B3B3]">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
            disabled={!naturalSize}
            aria-label="Zoom photo"
            className="mt-3 block w-full accent-[#E50914]"
          />
          <span className="mt-1 block text-right text-[11px] text-[#777]">{zoom.toFixed(1)}×</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[#B3B3B3] hover:bg-white/[0.06]">Cancel</button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={!naturalSize}
            className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Use photo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}