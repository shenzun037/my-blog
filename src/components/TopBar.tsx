import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Moon, Sun, Globe, Shield, X, Check, Laptop } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { THEME_FAMILIES } from '../constants/themes';
import { ColorFamilyId } from '../types/journal';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAdmin: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileSidebar,
  searchQuery,
  onSearchChange,
  onOpenAdmin,
}) => {
  const {
    currentTheme,
    colorFamily,
    appearanceMode,
    themeMode,
    setColorFamily,
    setAppearanceMode,
    setThemeMode,
    language,
    setLanguage,
    t,
  } = useJournal();

  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeMenu]);

  const activeFamily = THEME_FAMILIES[colorFamily] || THEME_FAMILIES.brown;

  return (
    <header
      className="sticky top-0 z-30 w-full backdrop-blur-md border-b transition-colors duration-300 px-6 py-3.5 flex items-center justify-between gap-4 theme-surface"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Zone 1: Mobile drawer toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="lg:hidden font-serif text-lg font-normal tracking-wide theme-text-primary">
          Shenzun
        </span>
      </div>

      {/* Zone 2: Editorial Subtitle */}
      <div className="hidden md:flex items-center justify-center flex-1">
        <span className="font-serif italic text-xs tracking-wider theme-text-muted">
          {language === 'th' ? t.header.kicker : 'A journal of ordinary magic'}
        </span>
      </div>

      {/* Zone 3: Controls (Search, Theme Palette, Language, Admin) */}
      <div className="flex items-center gap-3 text-xs">
        {/* Search Input / Trigger */}
        <div className="relative flex items-center">
          {showSearchInput ? (
            <div className="flex items-center gap-2 rounded-full px-3 py-1 theme-border border shadow-xs"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              <Search className="w-3.5 h-3.5 theme-text-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.header.searchPlaceholder}
                autoFocus
                className="bg-transparent border-none outline-none text-xs w-44 md:w-60 theme-text-primary placeholder:text-[var(--color-placeholder)]"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  onSearchChange('');
                }}
                className="theme-text-muted hover:theme-text-primary p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="p-2 rounded-lg theme-text-muted hover:theme-text-primary transition-colors"
              title="Search stories"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 13 Color Families & Appearance Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border theme-border transition-colors hover:shadow-xs"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
            title={t.header.themeMenu}
            aria-label="Theme palette and appearance menu"
            aria-expanded={showThemeMenu}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border shrink-0"
              style={{
                backgroundColor: activeFamily.swatchHex,
                borderColor: 'var(--color-border-strong)',
              }}
            />
            <span className="font-medium text-[11px] theme-text-primary hidden sm:inline">
              {language === 'th' ? activeFamily.nameTh : activeFamily.name}
            </span>
            {appearanceMode === 'dark' ? (
              <Moon className="w-3.5 h-3.5 theme-accent" />
            ) : (
              <Sun className="w-3.5 h-3.5 theme-accent" />
            )}
          </button>

          {showThemeMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl border p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-primary)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col">
                  <span className="font-serif font-medium text-sm theme-text-primary">
                    {t.header.themeMenu}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {themeMode === 'follow'
                      ? (language === 'th' ? 'เปลี่ยนตามเรื่องเล่า' : 'Dynamic story mood')
                      : themeMode === 'system'
                      ? (language === 'th' ? 'ตามการตั้งค่าระบบ' : 'System preferences')
                      : (language === 'th' ? 'ล็อกสีที่เลือกไว้' : 'Custom locked palette')}
                  </span>
                </div>

                {/* Appearance Mode Pill Switch */}
                <div
                  className="flex p-0.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface-muted)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <button
                    onClick={() => setAppearanceMode('light')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors ${
                      appearanceMode === 'light'
                        ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                        : 'theme-text-muted hover:theme-text-primary'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>{t.header.lightMode}</span>
                  </button>
                  <button
                    onClick={() => setAppearanceMode('dark')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors ${
                      appearanceMode === 'dark'
                        ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                        : 'theme-text-muted hover:theme-text-primary'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>{t.header.darkMode}</span>
                  </button>
                </div>
              </div>

              {/* Theme Policy Toggles */}
              <div className="mb-3">
                <span className="block text-[10px] font-mono uppercase tracking-wider theme-text-muted mb-1.5">
                  {t.header.themePolicyLabel}
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface-muted)' }}
                >
                  <button
                    onClick={() => setThemeMode('follow')}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors text-center ${
                      themeMode === 'follow'
                        ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                        : 'theme-text-muted hover:theme-text-primary'
                    }`}
                  >
                    {language === 'th' ? 'ตามเรื่องเล่า' : 'Follow Story'}
                  </button>
                  <button
                    onClick={() => setThemeMode('lock')}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors text-center ${
                      themeMode === 'lock'
                        ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                        : 'theme-text-muted hover:theme-text-primary'
                    }`}
                  >
                    {language === 'th' ? 'ล็อกสีนี้' : 'Lock Color'}
                  </button>
                  <button
                    onClick={() => setThemeMode('system')}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors text-center ${
                      themeMode === 'system'
                        ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                        : 'theme-text-muted hover:theme-text-primary'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Laptop className="w-2.5 h-2.5" />
                      {language === 'th' ? 'ตามระบบ' : 'System'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 13 Color Families Grid */}
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-wider theme-text-muted mb-2">
                  {t.header.colorFamilyLabel} (13 Palettes)
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {(Object.keys(THEME_FAMILIES) as ColorFamilyId[]).map((familyKey) => {
                    const fam = THEME_FAMILIES[familyKey];
                    const isSelected = colorFamily === familyKey;

                    return (
                      <button
                        key={familyKey}
                        onClick={() => {
                          setColorFamily(familyKey, true);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl text-left transition-all border ${
                          isSelected
                            ? 'theme-border-strong font-semibold shadow-xs'
                            : 'border-transparent hover:theme-border'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--color-surface-raised)'
                            : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border"
                            style={{
                              backgroundColor: fam.swatchHex,
                              borderColor: 'var(--color-border-strong)',
                            }}
                          />
                          <span className="truncate text-[11px] theme-text-primary">
                            {language === 'th' ? fam.nameTh : fam.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 theme-accent shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bilingual Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border theme-border hover:shadow-xs transition-colors font-medium text-xs theme-text-secondary hover:theme-text-primary"
          style={{ backgroundColor: 'var(--color-surface-raised)' }}
          title="Switch language between English and Thai"
        >
          <Globe className="w-3.5 h-3.5 theme-text-muted" />
          <span>{language === 'en' ? 'EN' : 'ไทย'}</span>
        </button>

        {/* Admin Link */}
        <button
          onClick={onOpenAdmin}
          className="p-2 rounded-lg theme-text-muted hover:theme-text-primary transition-colors"
          title="Admin CMS Studio"
          aria-label="Admin CMS"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
