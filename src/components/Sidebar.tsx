import React from 'react';
import { useJournal } from '../context/JournalContext';
import { AudioPlayerDock } from './AudioPlayerDock';
import { Sparkles, X } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { settings, t, favorites, language } = useJournal();

  const navItems = [
    { id: 'home', label: t.nav.home },
    { id: 'journal', label: t.nav.journal },
    { id: 'photos', label: t.nav.photos },
    {
      id: 'favorites',
      label: t.nav.favorites,
      count: favorites.length > 0 ? favorites.length : undefined,
    },
    { id: 'about', label: t.nav.about },
    { id: 'contact', label: t.nav.contact },
    { id: 'admin', label: t.nav.admin },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[min(20rem,100vw)] lg:w-80 shrink-0 z-40 flex flex-col justify-between overflow-hidden transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Background Image with Ambient Scrim */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={settings.sidebarImage || '/images/tabim.jpg'}
            alt="Cozy sanctuary corner"
            className="w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.05]"
            referrerPolicy="no-referrer"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith('/images/tabim.jpg')) event.currentTarget.src = '/images/tabim.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/40" />
        </div>

        {/* Top Header & Brand */}
        <div className="p-7 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-serif text-2xl tracking-wide font-normal text-white/95">
              {settings.wordmark || "Shenzun's blog"}
            </h1>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-xs text-white/60 font-light tracking-wide leading-relaxed">
            {language === 'th' ? settings.subtitleTh : settings.subtitleEn}
          </p>

          {/* Navigation Items */}
          <nav className="mt-8 space-y-3.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 text-left text-sm tracking-wide transition-all group ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isActive ? 'bg-white scale-110' : 'bg-transparent group-hover:bg-white/40'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-[11px] text-white/40 tabular-nums ml-auto font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Subtle Persona Quote */}
          <div className="mt-8 pt-5 border-t border-white/10">
            <p className="text-[11px] italic font-serif text-white/50 tracking-wider">
              {t.sidebar.quote}
            </p>
          </div>
        </div>

        {/* Bottom Audio Player Dock */}
        <div className="min-w-0 p-5 text-white">
          <AudioPlayerDock />
          <div className="mt-3 text-center">
            <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
              {t.sidebar.musicKicker}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
