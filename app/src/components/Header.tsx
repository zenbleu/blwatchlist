import { Minus, Search, X } from 'lucide-react';

interface HeaderProps {
  onSearchOpen: () => void;
  desktopMode?: DesktopDisplayMode;
}

export default function Header({ onSearchOpen, desktopMode }: HeaderProps) {
  const desktopShell = window.blDesktopShell;

  return (
    <header className={`fixed ${desktopMode === 'windowed' ? 'top-8' : 'top-0'} left-0 right-0 z-40 glass-strong`}>
      <div className="flex items-center justify-between px-4 h-14">
        {/* Hamburger menu is rendered by SidebarNav as a fixed button */}
        {/* Spacer to account for hamburger button */}
        <div className="w-10" />
        
        <h1 className="text-base font-extrabold tracking-tight absolute left-1/2 -translate-x-1/2" style={{ color: "#E50914" }}>
          BL WATCHLIST
        </h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onSearchOpen}
            className="w-10 h-10 flex items-center justify-center rounded-lg tap-active"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-white" />
          </button>
          {desktopMode === 'borderless' && desktopShell && (
            <>
              <button
                type="button"
                onClick={() => void desktopShell.minimizeWindow()}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Minimize window"
                title="Minimize window"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void desktopShell.closeWindow()}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-red-500/20 hover:text-red-300"
                aria-label="Close window"
                title="Close window"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
