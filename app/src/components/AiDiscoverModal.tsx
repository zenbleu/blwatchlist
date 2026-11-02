import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Plus, Check, RefreshCw, Key, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import {
  fetchRecommendationsWithAI,
  type GeminiRecommendation,
} from '@/lib/gemini';
import type { Entry } from '@/types';

interface AiDiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettings?: () => void;
}

export default function AiDiscoverModal({
  isOpen,
  onClose,
}: AiDiscoverModalProps) {
  const { state, dispatch } = useApp();
  const [recommendations, setRecommendations] = useState<GeminiRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedTitles, setAddedTitles] = useState<Record<string, boolean>>({});

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const loadRecommendations = useCallback(async () => {
    if (!isOnline) return;

    setIsLoading(true);
    setError(null);

    try {
      // Gather favorite titles
      const favoriteTitles = state.favorites
        .map((f) => state.entries.find((e) => e.id === f.entryId)?.title)
        .filter((t): t is string => Boolean(t));

      // If favorites list is small, supplement with top-rated completed entries
      if (favoriteTitles.length < 3) {
        state.entries
          .filter((e) => e.status === 'COMPLETE')
          .slice(0, 5)
          .forEach((e) => {
            if (!favoriteTitles.includes(e.title)) {
              favoriteTitles.push(e.title);
            }
          });
      }

      // Gather top genre names
      const genreCounts: Record<string, number> = {};
      state.entries.forEach((e) => {
        (e.genres || []).forEach((gid) => {
          genreCounts[gid] = (genreCounts[gid] || 0) + 1;
        });
      });
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([gid]) => state.genreTags.find((t) => t.id === gid)?.name)
        .filter((n): n is string => Boolean(n));

      const results = await fetchRecommendationsWithAI(favoriteTitles, topGenres);
      setRecommendations(results);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, state.favorites, state.entries, state.genreTags]);

  useEffect(() => {
    if (isOpen && isOnline && recommendations.length === 0 && !isLoading) {
      void loadRecommendations();
    }
  }, [isOpen, isOnline, recommendations.length, isLoading, loadRecommendations]);

  const handleAddToPlanned = (item: GeminiRecommendation) => {
    const existing = state.entries.find(
      (e) => e.title.toLowerCase().trim() === item.title.toLowerCase().trim(),
    );
    if (existing) {
      setAddedTitles((prev) => ({ ...prev, [item.title]: true }));
      return;
    }

    const newId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const newEntry: Entry = {
      id: newId,
      poster: null,
      title: item.title,
      type: item.type,
      year: item.year,
      country: item.country,
      status: 'PLANNED',
      relationshipType: 'original',
      totalEpisodes: item.totalEpisodes || (item.type === 'Movie' ? 1 : 12),
      createdAt: now,
      lastUpdatedAt: now,
      genres: [],
    };

    dispatch({ type: 'ADD_ENTRY', payload: newEntry });
    setAddedTitles((prev) => ({ ...prev, [item.title]: true }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#141414] border-white/10 text-white max-w-lg p-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E50914]/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#E50914]" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              AI Discover &amp; Recommendations
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#888]">
            Curated Boys&apos; Love recommendations powered by Gemini based on your favorite series and watch patterns.
          </DialogDescription>
        </DialogHeader>

        {!isOnline ? (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Offline Mode</h3>
              <p className="text-xs text-[#888]">
                You are currently offline. Connect to the internet to get fresh AI recommendations.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#888]">
                <Loader2 className="w-7 h-7 text-[#E50914] animate-spin" />
                <p className="text-xs font-medium">Curating recommendations for you...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center space-y-3">
                <p className="text-xs text-red-400">{error}</p>
                <Button
                  onClick={() => void loadRecommendations()}
                  variant="outline"
                  className="text-xs border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((item, index) => {
                  const isAdded =
                    addedTitles[item.title] ||
                    state.entries.some(
                      (e) => e.title.toLowerCase().trim() === item.title.toLowerCase().trim(),
                    );

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5 flex flex-col sm:flex-row items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-[#B3B3B3]">
                            {item.year} &middot; {item.country} &middot; {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#888] mt-1.5 leading-relaxed">{item.reason}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToPlanned(item)}
                        disabled={isAdded}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isAdded
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                            : 'bg-[#E50914] hover:bg-[#b80710] text-white tap-active'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Watchlist</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Planned</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => void loadRecommendations()}
                    variant="ghost"
                    className="text-xs text-[#888] hover:text-white hover:bg-white/[0.06]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh Suggestions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-[#888]">No recommendations yet.</p>
                <Button
                  onClick={() => void loadRecommendations()}
                  className="bg-[#E50914] text-white text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Recommendations
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
