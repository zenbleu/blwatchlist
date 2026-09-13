import { Search } from 'lucide-react';

interface HeaderProps {
  onSearchOpen: () => void;
}

export default function Header({ onSearchOpen }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-strong">
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
        </div>
      </div>
    </header>
  );
}
