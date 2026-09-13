import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Check } from "lucide-react";
import { generateShareCard, downloadPNG, generateShareFilename, type ShareCardOptions, type ShareCardType } from "@/lib/utils";

interface ShareButtonProps {
  type: ShareCardType;
  title: string;
  subtitle?: string;
  entries: { title: string; poster: string | null; year?: number; country?: string }[];
  stats?: {
    totalEntries: number;
    completed: number;
    favorites: number;
    avgRating: string;
    topCountry: string;
    yearsCollecting: number | string;
  };
  year?: number;
  className?: string;
  label?: string;
}

export function useShareCard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const generate = useCallback(async (options: ShareCardOptions) => {
    setIsGenerating(true);
    try {
      // Small delay so the UI shows "Generating..."
      await new Promise((r) => setTimeout(r, 200));
      const dataUrl = await generateShareCard(options);
      const filename = generateShareFilename(options.type, options.year);
      downloadPNG(dataUrl, filename);
      setShowToast(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Share card generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, showToast };
}

export default function ShareButton({
  type,
  title,
  subtitle,
  entries,
  stats,
  year,
  className = "",
  label = "Share",
}: ShareButtonProps) {
  const { generate, isGenerating, showToast } = useShareCard();

  const handleClick = useCallback(async () => {
    if (isGenerating) return;
    await generate({
      type,
      title,
      subtitle,
      entries,
      stats,
      year,
      watermark: "BL Watchlist Manager",
    });
  }, [generate, isGenerating, type, title, subtitle, entries, stats, year]);

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all tap-active disabled:opacity-50 disabled:cursor-not-allowed ${
          isGenerating
            ? "bg-white/[0.06] text-[#B3B3B3]"
            : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] hover:text-white"
        } ${className}`}
        style={{ minWidth: 44, minHeight: 44 }}
        aria-label="Share as PNG"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Generating...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            {label && <span className="hidden sm:inline">{label}</span>}
          </>
        )}
      </button>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            PNG saved to downloads
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================================================
   Hidden ShareCard Renderer — off-screen DOM for html-to-image
   (Use this if you prefer html-to-image over Canvas API)
   ============================================================ */
export function HiddenShareCard({
  type,
  title,
  subtitle,
  entries,
  stats,
}: ShareCardOptions) {
  if (type === "stats" && stats) {
    return (
      <div
        className="fixed -left-[9999px] top-0 bg-[#0a0a0a] p-10"
        style={{ width: 1080, height: 1350 }}
        data-share-card
      >
        <div className="text-center mb-4">
          <h1 className="text-white text-5xl font-bold">{title}</h1>
          {subtitle && <p className="text-[#888] text-2xl mt-2">{subtitle}</p>}
          <div className="w-30 h-1 bg-[#E50914] mx-auto mt-4" style={{ width: 120, height: 3 }} />
        </div>

        <div className="space-y-4 mt-10">
          {[
            { label: "Total Entries", value: stats.totalEntries, icon: "📺" },
            { label: "Completed", value: stats.completed, icon: "✅" },
            { label: "Favorites", value: stats.favorites, icon: "❤️" },
            { label: "Avg Rating", value: `★ ${stats.avgRating}`, icon: "⭐" },
            { label: "Top Country", value: stats.topCountry, icon: "🌏" },
            { label: "Years Collecting", value: stats.yearsCollecting, icon: "📅" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between px-10 py-7 rounded-2xl border border-white/[0.06]"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{s.icon}</span>
                <span className="text-[#888] text-xl">{s.label}</span>
              </div>
              <span className="text-white text-3xl font-bold">{s.value}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-white/15 text-lg absolute bottom-10 left-0 right-0">
          BL Watchlist Manager
        </p>
      </div>
    );
  }

  if (type === "favorites") {
    const displayEntries = entries.slice(0, 6);
    return (
      <div
        className="fixed -left-[9999px] top-0 bg-[#0a0a0a] p-10"
        style={{ width: 1080, height: 1350 }}
        data-share-card
      >
        <div className="text-center mb-4">
          <h1 className="text-white text-5xl font-bold">{title}</h1>
          {subtitle && <p className="text-[#888] text-2xl mt-2">{subtitle}</p>}
          <div className="w-30 h-1 bg-[#E50914] mx-auto mt-4" style={{ width: 120, height: 3 }} />
        </div>

        <div
          className="grid gap-6 mt-8"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
          }}
        >
          {displayEntries.map((e) => (
            <div key={e.title} className="text-center">
              <div
                className="rounded-xl overflow-hidden mx-auto"
                style={{
                  width: 280,
                  height: 400,
                  backgroundColor: e.poster ? "transparent" : "#1a1a1a",
                }}
              >
                {e.poster && (
                  <img
                    src={e.poster}
                    alt={e.title}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                )}
              </div>
              <p className="text-[#B3B3B3] text-lg mt-3 truncate px-2">{e.title}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-white/15 text-lg absolute bottom-10 left-0 right-0">
          BL Watchlist Manager &middot; {entries.length} favorites
        </p>
      </div>
    );
  }

  // top10
  const displayEntries = entries.slice(0, 10);
  return (
    <div
      className="fixed -left-[9999px] top-0 bg-[#0a0a0a] p-10"
      style={{ width: 1080, height: 1350 }}
      data-share-card
    >
      <div className="text-center mb-4">
        <h1 className="text-white text-5xl font-bold">{title}</h1>
        {subtitle && <p className="text-[#888] text-2xl mt-2">{subtitle}</p>}
        <div className="w-30 h-1 bg-[#E50914] mx-auto mt-4" style={{ width: 120, height: 3 }} />
      </div>

      <div
        className="grid gap-4 mt-6"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
        }}
      >
        {displayEntries.map((e, i) => (
          <div key={e.title} className="text-center relative">
            <div
              className="absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold z-10"
              style={{
                backgroundColor:
                  i === 0 ? "#E50914" : i === 1 ? "#FF2D7B" : i === 2 ? "#FF6B35" : "#333",
              }}
            >
              {i + 1}
            </div>
            <div
              className="rounded-xl overflow-hidden mx-auto"
              style={{
                width: 170,
                height: 245,
                backgroundColor: e.poster ? "transparent" : "#1a1a1a",
              }}
            >
              {e.poster && (
                <img
                  src={e.poster}
                  alt={e.title}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-white/15 text-lg absolute bottom-10 left-0 right-0">
        BL Watchlist Manager
      </p>
    </div>
  );
}
