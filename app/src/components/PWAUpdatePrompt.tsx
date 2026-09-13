import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, X } from 'lucide-react';
import { useState } from 'react';

/**
 * PWAUpdatePrompt
 *
 * Silently checks for a new service-worker version in the background.
 * When a new build finishes downloading, a branded toast slides up from
 * the bottom of the screen offering the user a one-click update.
 */
export default function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Poll every 60 s when the tab is visible and online
      if (registration) {
        setInterval(() => {
          if (navigator.onLine && document.visibilityState === 'visible') {
            registration.update();
          }
        }, 60_000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const visible = needRefresh && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-update-prompt"
          initial={{ opacity: 0, y: 80, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
        >
          <div
            className="relative flex items-start gap-4 rounded-2xl border border-[#E50914]/30 bg-[#141414] px-4 py-4 shadow-2xl shadow-black/60 backdrop-blur-sm"
          >
            {/* Red accent bar on the left */}
            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-[#E50914]" />

            {/* Icon */}
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E50914]/10 text-[#E50914]">
              <Download className="h-4 w-4" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug">
                New Version Available
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
                A fresh update of BL Watchlist is ready. Reload to get the latest features instantly.
              </p>

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  className="h-8 gap-1.5 bg-[#E50914] hover:bg-[#c40812] text-white text-xs font-semibold px-3 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Update Version
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs px-3 rounded-lg transition-colors"
                >
                  Later
                </Button>
              </div>
            </div>

            {/* Dismiss × */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss update prompt"
              className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
