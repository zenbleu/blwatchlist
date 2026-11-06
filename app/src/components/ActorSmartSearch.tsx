import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, UserRound } from 'lucide-react';
import type { Actor } from '@/types';

interface ActorSmartSearchProps {
  label: string;
  selectedActorId: string;
  onSelectActorId: (id: string) => void;
  excludeActorId?: string;
  actors: Actor[];
  placeholder?: string;
}

export default function ActorSmartSearch({
  label,
  selectedActorId,
  onSelectActorId,
  excludeActorId,
  actors,
  placeholder = 'Search actor by name or country...',
}: ActorSmartSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedActor = useMemo(() => {
    return actors.find((a) => a.id === selectedActorId) || null;
  }, [actors, selectedActorId]);

  const filteredActors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actors
      .filter((a) => {
        if (excludeActorId && a.id === excludeActorId) return false;
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          a.nationality.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (!q) return b.filmography.length - a.filmography.length;
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return b.filmography.length - a.filmography.length;
      });
  }, [actors, excludeActorId, query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-[#888] font-semibold uppercase tracking-wider text-[10px] block">
        {label}
      </label>

      {selectedActor ? (
        /* Selected Actor Chip with fast Remove */
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#222] shrink-0 border border-white/10 flex items-center justify-center">
              {selectedActor.photo ? (
                <img
                  src={selectedActor.photo}
                  alt={selectedActor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserRound className="w-4 h-4 text-[#777]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{selectedActor.name}</p>
              <p className="text-[10px] text-[#777] truncate">
                {selectedActor.nationality} · {selectedActor.filmography.length}{' '}
                {selectedActor.filmography.length === 1 ? 'show' : 'shows'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectActorId('')}
            className="p-1 rounded-lg text-[#888] hover:text-white hover:bg-white/10 transition-colors"
            title="Change actor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Smart Type-Ahead Input with Dropdown */
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors"
          />

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#181818] p-1 shadow-2xl space-y-0.5">
              {filteredActors.length > 0 ? (
                filteredActors.slice(0, 20).map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectActorId(actor.id);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.08] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-[#222] shrink-0 border border-white/10 flex items-center justify-center">
                        {actor.photo ? (
                          <img
                            src={actor.photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserRound className="w-3.5 h-3.5 text-[#666]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors truncate">
                          {actor.name}
                        </p>
                        <p className="text-[10px] text-[#777]">{actor.nationality}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#666] font-medium shrink-0 ml-2">
                      {actor.filmography.length} {actor.filmography.length === 1 ? 'title' : 'titles'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-[#777]">
                  No actors matching &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
