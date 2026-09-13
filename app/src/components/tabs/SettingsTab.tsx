import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  Save,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Settings,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { migrateOngoing, useApp } from '@/context/AppContext';
import { useWrapped } from '@/context/WrappedContext';
import { useAnnualWrapped } from '@/context/AnnualWrappedContext';
import { saveToIndexedDB, clearIndexedDB } from '@/hooks/useIndexedDB';
import type { StorageResult, AppState, FullBackup, BackupMetadata } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { normalizeFavoriteEntry } from '@/lib/rating';

const APP_VERSION = '1.3.8';

export default function SettingsTab() {
  const { state, dispatch } = useApp();
  const { openHistory, snapshots } = useWrapped();
  const {
    openAnnualHistory,
    annualSnapshots,
  } = useAnnualWrapped();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unviewedCount = snapshots.filter(s => !s.isViewed).length;
  const unviewedAnnualCount = annualSnapshots.filter(s => !s.isViewed).length;

  // Save Now state
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const [saveResult, setSaveResult] = useState<StorageResult | null>(null);

  // Exit state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitSaved, setExitSaved] = useState(false);
  const [exitResult, setExitResult] = useState<StorageResult | null>(null);

  // Import state
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportError, setShowImportError] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importMigratedCount, setImportMigratedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Clear data state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Post-import profile prompt
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const handleSave = useCallback(async () => {
    setSaveResult(null);
    const result = await saveToIndexedDB(state);
    setSaveResult(result);
    setShowSaveStatus(true);
  }, [state]);

  const handleExit = useCallback(async () => {
    setExitResult(null);
    setExitSaved(false);
    const result = await saveToIndexedDB(state);
    setExitResult(result);
    setExitSaved(result.success);
    setShowExitConfirm(true);
  }, [state]);

  const handleExport = useCallback(() => {
    const metadata: BackupMetadata = {
      backupVersion: '1.0',
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION
    };

    const backup: FullBackup = {
      metadata,
      entries: state.entries,
      ongoing: state.ongoing,
      favorites: state.favorites,
      ratings: state.ratings,
      top10Drawers: state.top10Drawers,
      ongoingYear: state.ongoingYear,
      watchingSince: state.watchingSince
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BL-Watchlist-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setShowImportError(false);
    setShowImportSuccess(false);
    setImportMigratedCount(0);

    // Enter import mode
    setIsImporting(true);
    dispatch({ type: 'SET_IMPORT_MODE', payload: true });

    try {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        setImportError(`File too large (${fileSizeMB.toFixed(1)} MB). Maximum allowed is 100 MB.`);
        setShowImportError(true);
        dispatch({ type: 'SET_IMPORT_MODE', payload: false });
        setIsImporting(false);
        return;
      }

      const text = await file.text();

      // Try to parse
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError('Invalid JSON file. Please make sure the file is a valid BL Watchlist backup.');
        setShowImportError(true);
        dispatch({ type: 'SET_IMPORT_MODE', payload: false });
        setIsImporting(false);
        return;
      }

      const data = parsed as Record<string, unknown>;

      // Check if this is a full backup (new format) or legacy format
      const hasMetadata = data.metadata && typeof data.metadata === 'object';
      const entries = Array.isArray(data.entries) ? data.entries : [];

      if (entries.length === 0) {
        setImportError('The backup file contains no entries.');
        setShowImportError(true);
        dispatch({ type: 'SET_IMPORT_MODE', payload: false });
        setIsImporting(false);
        return;
      }

      // Check total data size after import
      const estimatedSizeMB = text.length / (1024 * 1024);
      if (estimatedSizeMB > 50) {
        setImportError(
          `Import too large (${estimatedSizeMB.toFixed(1)} MB). The data may exceed IndexedDB storage limits. ` +
          'Consider removing poster images from some entries to reduce size.'
        );
        setShowImportError(true);
        dispatch({ type: 'SET_IMPORT_MODE', payload: false });
        setIsImporting(false);
        return;
      }

      // Legacy migration: count INCOMPLETE entries that will be migrated to COMPLETE
      let migratedCount = 0;
      const processedEntries = entries.map((e: Record<string, unknown>) => {
        // Ensure timestamps exist for legacy entries
        const createdAt = typeof e.createdAt === 'number' ? e.createdAt : Date.now();
        e = {
          ...e,
          createdAt,
          lastUpdatedAt: typeof e.lastUpdatedAt === 'number' ? e.lastUpdatedAt : createdAt,
        };
        // Legacy status migration: INCOMPLETE -> COMPLETE
        if (e.status === 'INCOMPLETE') {
          migratedCount++;
          e = { ...e, status: 'COMPLETE' };
        }
        return e;
      });
      setImportMigratedCount(migratedCount);

      // Build full state from imported data
      let newState: AppState;

      if (hasMetadata) {
        // Full backup format - restore everything
        const validEntryIds = new Set(
          processedEntries
            .filter((entry) => entry.status === 'ONGOING')
            .map((entry) => entry.id),
        );
        const importedOngoing = (Array.isArray(data.ongoing) ? data.ongoing : [])
          .map((ongoing) =>
            ongoing && typeof ongoing === 'object'
              ? migrateOngoing(ongoing as Record<string, unknown>)
              : null,
          )
          .filter((ongoing): ongoing is NonNullable<typeof ongoing> =>
            ongoing !== null && validEntryIds.has(ongoing.entryId),
          );

        newState = {
          entries: processedEntries as unknown as AppState['entries'],
          ongoing: importedOngoing,
          favorites: Array.isArray(data.favorites)
            ? (data.favorites as Array<Record<string, unknown>>).map(normalizeFavoriteEntry)
            : [],
          ratings: Array.isArray(data.ratings)
            ? (data.ratings as Array<Record<string, unknown>>).map(normalizeFavoriteEntry)
            : (Array.isArray(data.favorites)
              ? (data.favorites as Array<Record<string, unknown>>).map(normalizeFavoriteEntry)
              : []),
          top10Drawers: Array.isArray(data.top10Drawers) ? (data.top10Drawers as Array<Record<string, unknown>>).map((td: Record<string, unknown>) => ({
            year: typeof td.year === 'number' ? td.year : new Date().getFullYear(),
            entries: Array.isArray(td.entries) ? (td.entries as Array<Record<string, unknown>>).map((e: Record<string, unknown>) => ({
              entryId: (e.entryId as string) || '',
              rank: typeof e.rank === 'number' ? e.rank : 1
            })) : []
          })) as AppState['top10Drawers'] : [],
          ongoingYear: typeof data.ongoingYear === 'number' ? data.ongoingYear : new Date().getFullYear(),
          watchingSince: typeof data.watchingSince === 'number' ? data.watchingSince : null,
          importMode: false,
          milestoneQueue: [],
          celebratedMilestones: Array.isArray(data.celebratedMilestones) ? data.celebratedMilestones as string[] : [],
        };
      } else {
        // Legacy format - entries only
        newState = {
          entries: processedEntries as unknown as AppState['entries'],
          ongoing: [],
          favorites: [],
          ratings: [],
          top10Drawers: [],
          ongoingYear: new Date().getFullYear(),
          watchingSince: null,
          importMode: false,
          milestoneQueue: [],
          celebratedMilestones: [],
        };
      }

      // Clean up: remove favorites and top10 entries for dropped entries
      const droppedIds = new Set(newState.entries.filter(e => e.status === 'DROPPED').map(e => e.id));
      newState.favorites = newState.favorites.filter(f => !droppedIds.has(f.entryId));
      newState.top10Drawers = newState.top10Drawers.map(d => ({
        ...d,
        entries: d.entries.filter(e => !droppedIds.has(e.entryId)).map((e, i) => ({ ...e, rank: i + 1 }))
      }));

      // Save directly to IndexedDB
      await saveToIndexedDB(newState);

      // Update app state
      dispatch({ type: 'SET_STATE', payload: newState });

      // Show success
      setShowImportSuccess(true);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Import failed: ${msg}`);
      setShowImportError(true);
    } finally {
      // Exit import mode
      dispatch({ type: 'SET_IMPORT_MODE', payload: false });
      setIsImporting(false);
    }
  }, [dispatch]);

  const handleClearData = useCallback(async () => {
    await clearIndexedDB();
    dispatch({
      type: 'SET_STATE',
      payload: {
        entries: [],
        ongoing: [],
        favorites: [],
         ratings: [],
        top10Drawers: [],
        ongoingYear: new Date().getFullYear(),
        watchingSince: null,
        importMode: false,
        milestoneQueue: [],
        celebratedMilestones: [],
      }
    });
    setShowClearConfirm(false);
  }, [dispatch]);


  return (
    <div className="space-y-6 w-full relative">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-[#E50914]" />
        <h1 className="text-2xl font-extrabold">Settings</h1>
      </div>

      {/* Data Management Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Data Management</h2>

        <div className="space-y-2">
          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Import JSON</p>
              <p className="text-xs text-[#666]">Restore from backup file</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          {/* Export */}
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Export JSON</p>
              <p className="text-xs text-[#666]">Save full backup with all data</p>
            </div>
          </button>

          {/* Save Now */}
          <button
            onClick={handleSave}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <Save className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Save Now</p>
              <p className="text-xs text-[#666]">Save all changes to IndexedDB</p>
            </div>
          </button>

          {/* Exit */}
          <button
            onClick={handleExit}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-[#E50914]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Exit</p>
              <p className="text-xs text-[#666]">Save and close application</p>
            </div>
          </button>

          {/* Clear All Data */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-red-500/10 text-white hover:bg-red-500/5 transition-colors tap-active text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-400">Clear All Data</p>
              <p className="text-xs text-[#666]">Delete all entries and reset app</p>
            </div>
          </button>
        </div>
      </div>

      {/* Monthly Wrapped Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Monthly Wrapped</h2>
        <button
          onClick={openHistory}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-white/[0.06] text-white hover:bg-white/[0.04] transition-colors tap-active text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0 relative">
            <Sparkles className="w-5 h-5 text-[#E50914]" />
            {unviewedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E50914] text-white text-[10px] font-bold flex items-center justify-center">
                {unviewedCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Wrapped History</p>
            <p className="text-xs text-[#666]">Review your monthly BL journey summaries</p>
          </div>
        </button>
      </div>

      {/* Annual Wrapped Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#888]">Annual Wrapped</h2>
        <button
          onClick={openAnnualHistory}
          className="w-full flex items-center gap-3 rounded-xl border border-[#E50914]/20 bg-[#141414] px-4 py-3.5 text-left text-white transition-colors hover:bg-[#E50914]/5 tap-active"
        >
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#E50914]/10">
            <Sparkles className="h-5 w-5 text-[#E50914]" />
            {unviewedAnnualCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E50914] text-[10px] font-bold text-white">
                {unviewedAnnualCount}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Annual BL Wrapped</p>
            <p className="text-xs text-[#666]">Relive the grand finale of each BL year</p>
          </div>
        </button>
      </div>

      {/* About Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">About</h2>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <p className="text-sm text-[#B3B3B3] leading-relaxed">
            BL Watchlist Manager is a personal collection manager designed for Boys' Love (BL) series and movies. It helps users organize their watchlist, monitor ongoing releases, evaluate favorites with a detailed scoring system, create annual Top 10 rankings, and explore their viewing habits through personalized statistics and achievements.
          </p>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Version</span>
            <span>{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Entries</span>
            <span>{state.entries.filter(e => e.status === 'COMPLETE' || e.status === 'ONGOING').length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Favorites</span>
            <span>{state.favorites.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Top 10 Drawers</span>
            <span>{state.top10Drawers.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Storage</span>
            <span>IndexedDB</span>
          </div>
        </div>
      </div>

      {/* Quote Section */}
      <div className="py-12 text-center space-y-4">
        {/* Top divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        <div className="space-y-3">
          <p className="text-white/80 text-base italic font-light tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            &ldquo;Freedom is the<br />Oxygen of the Soul.&rdquo;
          </p>
          <p className="text-lg">🌈</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            Every story reminds us that love,<br />
            identity, and self-expression deserve<br />
            to be lived without fear.
          </p>
        </div>

        {/* Bottom divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Save Status Modal */}
      <AnimatePresence>
        {showSaveStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowSaveStatus(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                {saveResult?.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <h3 className="text-white font-semibold">
                  {saveResult?.success ? 'Save Status' : 'Save Failed'}
                </h3>
              </div>

              <p className="text-sm text-[#B3B3B3] mt-2">{saveResult?.message}</p>

              {saveResult?.details && (
                <div className="mt-3 p-3 rounded-lg bg-white/[0.04]">
                  <p className="text-xs text-[#888] leading-relaxed">{saveResult?.details}</p>
                </div>
              )}

              {!saveResult?.success && saveResult?.error && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 font-mono">{saveResult?.error}</p>
                </div>
              )}

              <button
                onClick={() => setShowSaveStatus(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                {saveResult?.success ? 'Got it' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirm Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                {exitResult?.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <h3 className="text-white font-semibold">
                  {exitResult?.success ? 'Save & Exit' : 'Exit - Save Failed'}
                </h3>
              </div>

              <p className="text-sm text-[#B3B3B3] mt-2">{exitResult?.message}</p>

              {exitResult?.details && (
                <div className="mt-3 p-3 rounded-lg bg-white/[0.04]">
                  <p className="text-xs text-[#888] leading-relaxed">{exitResult?.details}</p>
                </div>
              )}

              {!exitResult?.success && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Database className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Root Cause:</p>
                    <p className="text-xs text-[#888] mt-1">
                      The original app used localStorage (5-10MB limit). With poster images,
                      every save hit the QuotaExceededError. We use IndexedDB (50MB+). If this
                      still fails, your browser storage is full or private mode is active.
                    </p>
                  </div>
                </div>
              )}

              {exitResult?.success && (
                <p className="text-sm text-[#B3B3B3] mt-1">
                  {exitSaved
                    ? 'You have saved all changes. Are you sure you want to exit?'
                    : 'You have unsaved changes. Save before exiting?'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={() => window.close()}
                  className="flex-1 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
                >
                  Close Tab
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Error Modal */}
      <AnimatePresence>
        {showImportError && importError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowImportError(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-white font-semibold">Import Failed</h3>
              </div>
              <p className="text-sm text-[#B3B3B3] mt-2">{importError}</p>
              <button
                onClick={() => setShowImportError(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Success Modal (1st) */}
      <AnimatePresence>
        {showImportSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-white font-semibold">Import Successful</h3>
              </div>
              <p className="text-sm text-[#B3B3B3] mt-2">
                All data has been restored successfully, including entries, ongoing metadata,
                favorites, ratings, Top 10 rankings, and settings.
              </p>
              {importMigratedCount > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 font-medium">
                    Legacy Migration: {importMigratedCount} entries with &quot;Incomplete&quot; status were automatically converted to &quot;Complete&quot;.
                  </p>
                </div>
              )}
              <button
                onClick={() => { setShowImportSuccess(false); setShowProfilePrompt(true); }}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Prompt Modal (2nd — after import) */}
      <AnimatePresence>
        {showProfilePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-white font-bold text-lg mb-2">Profile Updated!</h3>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Your <span className="text-white font-semibold">Collection Personality</span> and{' '}
                <span className="text-white font-semibold">Achievement Showcase</span> have been updated
                based on your imported data.
              </p>
              <p className="text-sm text-[#B3B3B3] mt-3 leading-relaxed">
                Check your <span className="text-[#E50914] font-semibold">BL Watcher Profile</span> to
                see your updated title, unlocked achievements, and personalized collection insights.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowProfilePrompt(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[#B3B3B3] text-sm font-medium transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowProfilePrompt(false);
                    window.dispatchEvent(new CustomEvent('bl-open-profile'));
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
                >
                  View Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E50914]" />
              Clear All Data?
            </DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              This will permanently delete all entries, favorites, ongoing data, and Top 10 rankings.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 bg-white/[0.06] border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearData}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              Delete Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
