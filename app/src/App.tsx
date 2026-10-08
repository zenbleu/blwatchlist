import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from '@/context/AppContext';
import { WrappedProvider } from '@/context/WrappedContext';
import { AnnualWrappedProvider } from '@/context/AnnualWrappedContext';
import Header from '@/components/Header';
import SidebarNav, { type TabId } from '@/components/SidebarNav';
import MilestoneModal from '@/components/MilestoneModal';
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt';
import { WrappedPresentationContainer } from '@/components/wrapped/WrappedPresentation';
import WrappedHistory from '@/components/wrapped/WrappedHistory';
import { AnnualWrappedPresentationContainer } from '@/components/wrapped/AnnualWrappedPresentation';
import AnnualWrappedHistory from '@/components/wrapped/AnnualWrappedHistory';
import FavoriteEvaluation from '@/components/FavoriteEvaluation';
import CompletionCelebrationModal from '@/components/CompletionCelebrationModal';
import DesktopUpdatePrompt from '@/components/DesktopUpdatePrompt';
import { Maximize2, Minimize, Minus, X } from 'lucide-react';
// Overview is the landing tab — keep it eager so first paint is instant
import OverviewTab from '@/components/tabs/OverviewTab';
import './App.css';

// ── Lazy-loaded routes ────────────────────────────────────────────────────────
// Each lazy() call produces a separate JS chunk that is only downloaded
// when the user first navigates to that tab.
const BLSeriesTab      = lazy(() => import('@/components/tabs/BLSeriesTab'));
const OngoingTab       = lazy(() => import('@/components/tabs/OngoingTab'));
const FavoritesTab     = lazy(() => import('@/components/tabs/FavoritesTab'));
const Top10Tab         = lazy(() => import('@/components/tabs/Top10Tab'));
const StatisticsTab    = lazy(() => import('@/components/tabs/StatisticsTab'));
const GenresTab        = lazy(() => import('@/components/tabs/GenresTab'));
const ActorsTab        = lazy(() => import('@/components/tabs/ActorsTab'));
const SettingsTab      = lazy(() => import('@/components/tabs/SettingsTab'));
const SearchOverlay    = lazy(() => import('@/components/SearchOverlay'));
const BLWatcherProfile = lazy(() => import('@/components/BLWatcherProfile'));

// ── Minimal tab-loading skeleton ──────────────────────────────────────────────
function TabFallback() {
  return (
    <div className="w-full flex items-center justify-center py-20">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        className="w-6 h-6 rounded-full bg-[#E50914]"
      />
    </div>
  );
}

function isDesktopDisplayMode(value: unknown): value is DesktopDisplayMode {
  return value === 'fullscreen' || value === 'windowed' || value === 'borderless';
}

function DesktopWindowTitleBar() {
  const desktopShell = window.blDesktopShell;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!desktopShell) return;
    let isActive = true;
    desktopShell.isWindowMaximized().then((maximized) => {
      if (isActive) setIsMaximized(maximized);
    }).catch(() => {});
    const unsubscribe = desktopShell.onMaximizeStateChange(setIsMaximized);
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [desktopShell]);

  if (!desktopShell) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex h-8 items-center justify-between bg-[#111] px-3 text-white/80 [-webkit-app-region:drag]">
      <span className="select-none text-[11px] font-semibold tracking-wide">BL WATCHLIST</span>
      <div className="flex h-full items-center gap-1 [-webkit-app-region:no-drag]">
        <button
          type="button"
          onClick={() => void desktopShell.minimizeWindow()}
          className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
          aria-label="Minimize window"
          title="Minimize window"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void desktopShell.toggleMaximizeWindow()}
          className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {isMaximized ? <Minimize className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => void desktopShell.closeWindow()}
          className="flex h-7 w-8 items-center justify-center rounded hover:bg-red-500/20 hover:text-red-300"
          aria-label="Close window"
          title="Close window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const {
    isLoaded,
    currentMilestone,
    dismissMilestone,
    currentCompletion,
    dismissCompletion,
    dispatch,
    isFavorited,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [desktopMode, setDesktopMode] = useState<DesktopDisplayMode>('fullscreen');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [completionRatingOpen, setCompletionRatingOpen] = useState(false);
  const [completionRatingEntryId, setCompletionRatingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const desktopShell = window.blDesktopShell;
    if (!desktopShell) return;

    let isActive = true;
    desktopShell.getDisplayMode()
      .then((mode) => {
        if (isActive) setDesktopMode(mode);
      })
      .catch(() => {});

    const handleDisplayModeChange = (event: Event) => {
      const mode = (event as CustomEvent<unknown>).detail;
      if (isDesktopDisplayMode(mode)) setDesktopMode(mode);
    };
    window.addEventListener('bl-display-mode-changed', handleDisplayModeChange);

    return () => {
      isActive = false;
      window.removeEventListener('bl-display-mode-changed', handleDisplayModeChange);
    };
  }, []);

  // Handle import events from SettingsTab
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      if (customEvent.detail) {
        window.location.reload();
      }
    };
    window.addEventListener('bl-import', handler);
    return () => window.removeEventListener('bl-import', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<TabId>;
      if (customEvent.detail) setActiveTab(customEvent.detail);
    };
    window.addEventListener('bl-navigate-tab', handler);
    return () => window.removeEventListener('bl-navigate-tab', handler);
  }, []);

  // Open the rating dialog only after the completion dialog has fully closed.
  // Radix dialogs manage focus and pointer-events globally; opening both in
  // the same click can leave the second dialog inaccessible or restore focus
  // into the closing dialog.
  useEffect(() => {
    if (completionRatingEntryId && !currentCompletion) {
      setCompletionRatingOpen(true);
    }
  }, [completionRatingEntryId, currentCompletion]);

  // Handle profile open events from SettingsTab post-import prompt
  useEffect(() => {
    const handler = () => {
      setActiveTab('statistics');
      setProfileOpen(true);
    };
    window.addEventListener('bl-open-profile', handler);
    return () => window.removeEventListener('bl-open-profile', handler);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#E50914] font-black text-2xl"
        >
          BL WATCHLIST
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {desktopMode === 'windowed' && <DesktopWindowTitleBar />}
      {/* Sidebar Navigation */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} windowed={desktopMode === 'windowed'} />

      {/* Header */}
      <Header onSearchOpen={() => setSearchOpen(true)} desktopMode={desktopMode} />

      {/* Main Content */}
      <main className={`${desktopMode === 'windowed' ? 'pt-24' : 'pt-16'} px-4 pb-6`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <Suspense fallback={<TabFallback />}>
              {activeTab === 'overview'    && <OverviewTab />}
              {activeTab === 'blseries'   && <BLSeriesTab />}
              {activeTab === 'ongoing'    && <OngoingTab />}
              {activeTab === 'favorites'  && <FavoritesTab />}
              {activeTab === 'top10'      && <Top10Tab />}
              {activeTab === 'statistics' && <StatisticsTab onViewProfile={() => setProfileOpen(true)} />}
              {activeTab === 'genres'     && <GenresTab />}
              {activeTab === 'actors'     && <ActorsTab />}
              {activeTab === 'settings'   && <SettingsTab />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Search Overlay — lazy, only loaded when first opened */}
      <Suspense fallback={null}>
        {searchOpen && (
          <SearchOverlay
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </Suspense>

      {/* BL Watcher Profile — lazy, only loaded from Statistics tab */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {profileOpen && (
            <BLWatcherProfile onBack={() => setProfileOpen(false)} />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Milestone Celebration Modal */}
      <MilestoneModal
        isOpen={!!currentMilestone}
        milestone={currentMilestone}
        onClose={dismissMilestone}
      />

      <CompletionCelebrationModal
        entry={currentCompletion}
        isFavorited={currentCompletion ? isFavorited(currentCompletion.id) : false}
        onClose={dismissCompletion}
        onRate={() => {
          const entryId = currentCompletion?.id;
          if (!entryId) return;
          setCompletionRatingEntryId(entryId);
          dismissCompletion();
        }}
        onFavorite={() => {
          const entry = currentCompletion;
          if (entry && !isFavorited(entry.id)) {
            dispatch({ type: 'TOGGLE_FAVORITE', payload: entry.id });
          }
        }}
        onTop10={() => {
          dismissCompletion();
          window.dispatchEvent(new CustomEvent('bl-navigate-tab', { detail: 'top10' }));
        }}
      />
      <FavoriteEvaluation
        isOpen={completionRatingOpen}
        onClose={() => {
          setCompletionRatingOpen(false);
          setCompletionRatingEntryId(null);
        }}
        entryId={completionRatingEntryId}
        initialMode="edit"
        evaluationType="rating"
      />

      {/* Monthly BL Wrapped — auto-present + history sheet */}
      <WrappedPresentationContainer />
      <WrappedHistory />
      {/* Annual BL Wrapped — yearly finale + permanent history */}
      <AnnualWrappedPresentationContainer />
      <AnnualWrappedHistory />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <WrappedProvider>
        <AnnualWrappedProvider>
          <AppContent />
          <PWAUpdatePrompt />
          <DesktopUpdatePrompt />
        </AnnualWrappedProvider>
      </WrappedProvider>
    </AppProvider>
  );
}

export default App;
