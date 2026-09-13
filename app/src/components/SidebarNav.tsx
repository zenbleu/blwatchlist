import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Film,
  PlayCircle,
  Heart,
  Star,
  BarChart3,
  Settings,
  X,
  Menu
} from 'lucide-react';

export type TabId = 'overview' | 'blseries' | 'ongoing' | 'favorites' | 'top10' | 'statistics' | 'settings';

interface SidebarNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'blseries', label: 'BL Series & Movies', icon: Film },
  { id: 'ongoing', label: 'Ongoing BL', icon: PlayCircle },
  { id: 'favorites', label: 'Favorite BL Of All Time', icon: Heart },
  { id: 'top10', label: 'Top 10 BL Series & Movies', icon: Star },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleTabClick = useCallback((tab: TabId) => {
    onTabChange(tab);
    // On mobile, auto-close sidebar when a nav item is selected
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, [onTabChange]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Completion actions can navigate directly to Top 10; close the mobile
  // drawer at the same time so the destination is immediately visible.
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener('bl-navigate-tab', handler);
    return () => window.removeEventListener('bl-navigate-tab', handler);
  }, []);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - Top Left */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-0 left-0 z-[60] w-14 h-14 flex items-center justify-center tap-active"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#0f0f0f] border-r border-white/[0.06] z-[80] flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <h1 className="text-base font-extrabold tracking-tight" style={{ color: '#E50914' }}>
                BL WATCHLIST
              </h1>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg tap-active"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-[#B3B3B3]" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all tap-active ${
                      isActive
                        ? 'bg-[#E50914]/15 text-[#E50914]'
                        : 'text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#E50914]' : 'text-[#666]'}`} />
                    <span className="text-left">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="px-4 py-4 border-t border-white/[0.06]">
              <p className="text-[10px] text-[#555] text-center">BL Watchlist Manager v1.3.2</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
