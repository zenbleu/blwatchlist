import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Play, X } from 'lucide-react';
import { useAnnualWrapped } from '@/context/AnnualWrappedContext';

export default function AnnualWrappedHistory() {
  const {
    annualSnapshots,
    annualHistoryOpen,
    closeAnnualHistory,
    replayAnnualSnapshot,
  } = useAnnualWrapped();
  const unviewed = annualSnapshots.filter(snapshot => !snapshot.isViewed);
  const viewed = annualSnapshots.filter(snapshot => snapshot.isViewed);

  const card = (year: number, isViewed: boolean) => (
    <motion.button
      key={year}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => replayAnnualSnapshot(year)}
      className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
    >
      <div className={`h-3 w-3 shrink-0 rounded-full ${isViewed ? 'bg-white/20' : 'bg-[#E50914]'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{year} BL Wrapped</span>
          {!isViewed && <span className="rounded bg-[#E50914]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#E50914]">NEW</span>}
        </div>
        <p className="mt-0.5 text-xs text-white/40">Replay your annual BL journey</p>
      </div>
      <Play size={16} className="shrink-0 text-white/30" />
    </motion.button>
  );

  return (
    <AnimatePresence>
      {annualHistoryOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeAnnualHistory} className="fixed inset-0 z-[120] bg-black/70" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-[125] flex max-h-[85vh] flex-col rounded-t-2xl bg-[#111]">
            <div className="flex justify-center pb-1 pt-3"><div className="h-1 w-10 rounded-full bg-white/20" /></div>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div><h2 className="text-lg font-bold text-white">Annual Wrapped</h2><p className="mt-0.5 text-xs text-white/40">{annualSnapshots.length} year{annualSnapshots.length === 1 ? '' : 's'} recorded</p></div>
               <button onClick={closeAnnualHistory} aria-label="Close Annual Wrapped history" className="rounded-full bg-white/10 p-2"><X size={18} className="text-white/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
               {annualSnapshots.length === 0 ? (
                 <div className="flex flex-col items-center justify-center gap-3 py-16 text-center"><Clock size={36} className="text-white/20" /><p className="text-sm text-white/40">Your first Annual Wrapped will appear<br />after the year comes to a close.</p></div>
              ) : (
                <>
                   {unviewed.length > 0 && <div className="mb-4"><p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-white/40">New</p><div className="flex flex-col gap-2">{unviewed.map(snapshot => card(snapshot.year, false))}</div></div>}
                  {viewed.length > 0 && <div><p className="mb-2 mt-4 px-1 text-xs font-semibold uppercase tracking-widest text-white/40">Previous years</p><div className="flex flex-col gap-2">{viewed.map(snapshot => card(snapshot.year, true))}</div></div>}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}