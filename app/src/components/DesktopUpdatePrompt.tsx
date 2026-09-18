import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UpdatePhase = 'hidden' | 'downloading' | 'ready' | 'installing' | 'error';

const initialProgress = {
  downloadedBytes: 0,
  totalBytes: null as number | null,
  percent: null as number | null,
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DesktopUpdatePrompt() {
  const [phase, setPhase] = useState<UpdatePhase>('hidden');
  const [progress, setProgress] = useState(initialProgress);
  const [update, setUpdate] = useState<DesktopUpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dismissedRef = useRef(false);

  useEffect(() => {
    const updater = window.blDesktopUpdater;
    if (!updater) return;

    const unsubscribe = updater.onProgress(setProgress);
    let cancelled = false;

    const checkAndDownload = async () => {
      let availableUpdate: DesktopUpdateInfo | null;
      try {
        availableUpdate = await updater.checkForUpdate();
      } catch (error) {
        // A missing manifest, offline launch, or unsupported desktop build is
        // not an update condition. Keep the UI completely hidden.
        console.warn('[Desktop updater] Update check failed:', error);
        return;
      }

      if (cancelled || !availableUpdate || dismissedRef.current) return;

      setUpdate(availableUpdate);
      setProgress(initialProgress);
      setPhase('downloading');

      try {
        const result = await updater.downloadUpdate();
        if (cancelled || !result || dismissedRef.current) return;
        if (result.cancelled) {
          setPhase('hidden');
          return;
        }
        setProgress((current) => ({ ...current, percent: 100 }));
        setPhase('ready');
      } catch (error: unknown) {
        if (cancelled || dismissedRef.current) return;
        console.warn('[Desktop updater] Update download failed:', error);
        setErrorMessage('The update could not be downloaded.');
        setPhase('error');
      }
    };

    void checkAndDownload();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleLater = () => {
    dismissedRef.current = true;
    setDismissed(true);
    setPhase('hidden');
    void window.blDesktopUpdater?.cancelDownload();
  };

  const handleUpdateNow = async () => {
    const updater = window.blDesktopUpdater;
    if (!updater) return;

    setPhase('installing');
    try {
      await updater.installUpdate();
    } catch (error) {
      console.warn('[Desktop updater] Could not start installer:', error);
      setErrorMessage('The update could not be started.');
      setPhase('error');
    }
  };

  const visible = !dismissed && phase !== 'hidden';
  const percentLabel = progress.percent == null ? 'Downloading…' : `${progress.percent}%`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, x: 24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-5 right-5 z-[9999] w-[min(360px,calc(100vw-2rem))]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[#E50914]/30 bg-[#141414]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-md">
            <div className="absolute inset-y-4 left-0 w-[3px] rounded-full bg-[#E50914]" />

            <div className="flex items-start gap-3 pl-1">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E50914]/10 text-[#E50914]">
                {phase === 'ready' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : phase === 'installing' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-white">
                  {phase === 'downloading' && 'The app is updating…'}
                  {phase === 'ready' && 'A new update is ready.'}
                  {phase === 'installing' && 'Installing the update…'}
                  {phase === 'error' && 'Update unavailable'}
                </p>

                {phase === 'downloading' && (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#E50914] transition-[width] duration-200"
                        style={{ width: `${progress.percent ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{percentLabel}</span>
                      <span>
                        {formatBytes(progress.downloadedBytes)}
                        {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}
                      </span>
                    </div>
                  </>
                )}

                {phase === 'ready' && update?.releaseNotes && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{update.releaseNotes}</p>
                )}

                {phase === 'error' && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{errorMessage}</p>
                )}

                {phase === 'downloading' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleLater}
                    className="mt-3 h-8 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    Later
                  </Button>
                )}

                {phase === 'ready' && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateNow}
                      className="h-8 gap-1.5 rounded-lg bg-[#E50914] px-3 text-xs font-semibold text-white hover:bg-[#c40812]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Update Now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleLater}
                      className="h-8 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      Later
                    </Button>
                  </div>
                )}

                {phase === 'error' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleLater}
                    className="mt-3 h-8 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    Later
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}