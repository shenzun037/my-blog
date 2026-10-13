import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ThemeId,
  ThemeConfig,
  ColorFamilyId,
  AppearanceMode,
  MusicTrack,
  Story,
  SiteSettings,
  MoodType,
} from '../types/journal';
import {
  THEME_FAMILIES,
  THEMES,
  buildThemeConfig,
  migrateThemeId,
  mapMoodToColorFamily,
} from '../constants/themes';
import { DICTIONARY, Language } from '../locales/i18n';
import {
  api,
  getFavorites,
  toggleFavorite,
  getAudioFavorites,
  toggleAudioFavorite,
  replaceAudioFavorites,
} from '../services/api';
import { INITIAL_SETTINGS } from '../constants/initialData';
import { resolveStoryMusicSelection } from '../services/storyMusicPolicy';

export type ThemeMode = 'follow' | 'lock' | 'system';
export type AudioMode = 'follow' | 'lock' | 'off';

interface JournalContextType {
  // Theme state & controls
  currentTheme: ThemeConfig;
  colorFamily: ColorFamilyId;
  appearanceMode: AppearanceMode;
  themeMode: ThemeMode;
  lockedThemeId: ThemeId;
  setColorFamily: (family: ColorFamilyId, lock?: boolean) => void;
  setAppearanceMode: (mode: AppearanceMode) => void;
  toggleAppearanceMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  selectTheme: (themeId: ThemeId, lock?: boolean) => void;
  applyStoryTheme: (story?: Story | null) => void;
  restoreDefaultTheme: () => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof DICTIONARY['en'];

  // Audio State & Controls
  currentTrack: MusicTrack | null;
  audioMode: AudioMode;
  selectTrack: (track: MusicTrack) => void;
  setAudioMode: (mode: AudioMode) => void;
  applyStoryAudio: (story?: Story | null) => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isAudioPlaying: boolean;
  audioCurrentTime: number;
  audioDuration: number;
  audioVolume: number;
  audioError: boolean;
  toggleAudioPlayback: () => Promise<void>;
  seekAudio: (time: number) => void;
  setAudioVolume: (volume: number) => void;
  handleAudioPlay: () => void;
  handleAudioPause: () => void;
  handleAudioTimeUpdate: () => void;
  handleAudioMetadata: () => void;
  handleAudioError: () => void;

  // Story Favorites (strictly story IDs)
  favorites: string[];
  isFavorite: (storyId: string) => boolean;
  toggleBookmark: (storyId: string) => void;

  // Audio Track Favorites (strictly track IDs, no collision!)
  audioFavorites: string[];
  isAudioFavorite: (trackId: string) => boolean;
  toggleAudioBookmark: (trackId: string) => void;

  // Public Stories & Settings Data
  stories: Story[];
  settings: SiteSettings;
  isLoading: boolean;
  refreshStories: () => Promise<void>;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
}

const JournalContext = createContext<JournalContextType | null>(null);

export const JournalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language State
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('shenzun_lang') as Language;
      return saved === 'th' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('shenzun_lang', lang);
    } catch {}
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = DICTIONARY[language];

  // 2. Settings & Stories (Public - Published Only)
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 3. Theme State (Color Family, Appearance Mode, and Policy Mode modeled independently)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('shenzun_theme_mode') as ThemeMode;
      return saved === 'follow' || saved === 'lock' || saved === 'system' ? saved : 'follow';
    } catch {
      return 'follow';
    }
  });

  const [persistedFamily, setPersistedFamily] = useState<ColorFamilyId>(() => {
    try {
      const savedFamily = localStorage.getItem('shenzun_color_family') as ColorFamilyId;
      if (savedFamily && THEME_FAMILIES[savedFamily]) return savedFamily;
      // Migrate from old theme preference if present
      const oldTheme = localStorage.getItem('shenzun_locked_theme');
      if (oldTheme) {
        return migrateThemeId(oldTheme).familyId;
      }
      return 'brown';
    } catch {
      return 'brown';
    }
  });

  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(() => {
    try {
      const savedMode = localStorage.getItem('shenzun_appearance_mode') as AppearanceMode;
      if (savedMode === 'light' || savedMode === 'dark') return savedMode;
      return 'light';
    } catch {
      return 'light';
    }
  });

  // Active theme coordinates in memory
  const [activeFamily, setActiveFamily] = useState<ColorFamilyId>(persistedFamily);
  const [activeAppearance, setActiveAppearance] = useState<AppearanceMode>(appearanceMode);

  // Appearance mode update with persistence
  const setAppearanceMode = (mode: AppearanceMode) => {
    setActiveAppearance(mode);
    setAppearanceModeState(mode);
    try {
      localStorage.setItem('shenzun_appearance_mode', mode);
    } catch {}
  };

  const toggleAppearanceMode = () => {
    setAppearanceMode(activeAppearance === 'dark' ? 'light' : 'dark');
  };

  // Color family selection
  const setColorFamily = (family: ColorFamilyId, lock: boolean = true) => {
    if (!THEME_FAMILIES[family]) return;
    setActiveFamily(family);
    if (lock) {
      setThemeModeState('lock');
      setPersistedFamily(family);
      try {
        localStorage.setItem('shenzun_color_family', family);
        localStorage.setItem('shenzun_theme_mode', 'lock');
      } catch {}
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('shenzun_theme_mode', mode);
    } catch {}
    if (mode === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setActiveAppearance(isDark ? 'dark' : 'light');
    } else if (mode === 'lock') {
      setActiveFamily(persistedFamily);
      setActiveAppearance(appearanceMode);
    }
  };

  // Backward compatibility: selectTheme maps any legacy or current theme ID
  const selectTheme = (themeId: ThemeId, lock: boolean = true) => {
    const migrated = migrateThemeId(themeId);
    setColorFamily(migrated.familyId, lock);
    if (themeId === 'midnight' || themeId === 'playful') {
      setAppearanceMode('dark');
    }
  };

  const applyStoryTheme = useCallback(
    (story?: Story | null) => {
      if (themeMode === 'lock') {
        setActiveFamily(persistedFamily);
        setActiveAppearance(appearanceMode);
        return;
      }
      if (themeMode === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActiveAppearance(isDark ? 'dark' : 'light');
        return;
      }
      // 'follow' mode
      if (story) {
        if (story.themeId && story.themeId !== 'auto') {
          const migrated = migrateThemeId(story.themeId);
          setActiveFamily(migrated.familyId);
          setActiveAppearance(migrated.mode);
        } else {
          // Deterministic mapping by mood
          const mapped = mapMoodToColorFamily(story.mood);
          setActiveFamily(mapped.familyId);
          setActiveAppearance(mapped.mode);
        }
      } else {
        // Returning to feed: restore user's persisted family
        setActiveFamily(persistedFamily);
        setActiveAppearance(appearanceMode);
      }
    },
    [themeMode, persistedFamily, appearanceMode]
  );

  const restoreDefaultTheme = useCallback(() => {
    if (themeMode === 'lock') {
      setActiveFamily(persistedFamily);
      setActiveAppearance(appearanceMode);
    } else if (themeMode === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setActiveAppearance(isDark ? 'dark' : 'light');
    } else {
      setActiveFamily(persistedFamily);
      setActiveAppearance(appearanceMode);
    }
  }, [themeMode, persistedFamily, appearanceMode]);

  // Construct reactive ThemeConfig
  const currentTheme: ThemeConfig = useMemo(() => {
    return buildThemeConfig(activeFamily, activeAppearance);
  }, [activeFamily, activeAppearance]);

  // Inject CSS custom properties and theme attributes onto DOM
  useEffect(() => {
    const root = document.documentElement;
    const tokens = currentTheme.tokens;

    document.body.style.backgroundColor = tokens.pageBg;
    document.body.style.color = tokens.textPrimary;

    root.style.setProperty('--color-page-bg', tokens.pageBg);
    root.style.setProperty('--color-surface', tokens.surface);
    root.style.setProperty('--color-surface-raised', tokens.surfaceRaised);
    root.style.setProperty('--color-surface-muted', tokens.surfaceMuted);
    root.style.setProperty('--color-text-primary', tokens.textPrimary);
    root.style.setProperty('--color-text-secondary', tokens.textSecondary);
    root.style.setProperty('--color-text-muted', tokens.textMuted);
    root.style.setProperty('--color-text-inverse', tokens.textInverse);
    root.style.setProperty('--color-link', tokens.link);
    root.style.setProperty('--color-link-hover', tokens.linkHover);
    root.style.setProperty('--color-accent', tokens.accent);
    root.style.setProperty('--color-accent-hover', tokens.accentHover);
    root.style.setProperty('--color-accent-pressed', tokens.accentPressed);
    root.style.setProperty('--color-accent-contrast-text', tokens.accentContrastText);
    root.style.setProperty('--color-border', tokens.border);
    root.style.setProperty('--color-border-strong', tokens.borderStrong);
    root.style.setProperty('--color-focus-ring', tokens.focusRing);
    root.style.setProperty('--color-selection-bg', tokens.selectionBg);
    root.style.setProperty('--color-selection-text', tokens.selectionText);
    root.style.setProperty('--color-overlay', tokens.overlay);
    root.style.setProperty('--color-input-bg', tokens.inputBg);
    root.style.setProperty('--color-input-text', tokens.inputText);
    root.style.setProperty('--color-placeholder', tokens.placeholder);
    root.style.setProperty('--color-success', tokens.success);
    root.style.setProperty('--color-warning', tokens.warning);
    root.style.setProperty('--color-error', tokens.error);

    // Fallbacks
    root.style.setProperty('--color-bg', tokens.pageBg);

    if (currentTheme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme]);

  // 4. Audio State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolumeState] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const [audioMode, setAudioModeState] = useState<AudioMode>(() => {
    try {
      const saved = localStorage.getItem('shenzun_audio_mode') as AudioMode;
      return saved === 'follow' || saved === 'lock' || saved === 'off' ? saved : 'follow';
    } catch {
      return 'follow';
    }
  });

  const setAudioMode = (mode: AudioMode) => {
    setAudioModeState(mode);
    try {
      localStorage.setItem('shenzun_audio_mode', mode);
    } catch {}
    if (mode === 'off') {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
      setAudioCurrentTime(0);
    }
  };

  const selectTrack = (track: MusicTrack) => {
    audioRef.current?.pause();
    setCurrentTrack(track);
    setAudioMode('lock');
  };

  const toggleAudioPlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || audioMode === 'off') return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setAudioError(false);
    try {
      await audio.play();
    } catch {
      setAudioError(true);
    }
  };

  const seekAudio = (time: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(time, audio.duration));
  };

  const setAudioVolume = (volume: number) => {
    const next = Math.max(0, Math.min(1, volume));
    setAudioVolumeState(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  const applyStoryAudio = useCallback(
    (story?: Story | null) => {
      const selection = resolveStoryMusicSelection(audioMode, currentTrack, story, settings.musicLibrary || []);
      if (!selection.shouldReplace) return;
      audioRef.current?.pause();
      setCurrentTrack(selection.track);
    },
    [audioMode, currentTrack, settings.musicLibrary]
  );

  useEffect(() => {
    audioRef.current?.pause();
    setIsAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioError(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack || settings.musicLibrary.some((track) => track.id === currentTrack.id)) return;
    audioRef.current?.pause();
    setCurrentTrack(null);
  }, [settings.musicLibrary, currentTrack?.id]);

  const handleAudioPlay = () => setIsAudioPlaying(true);
  const handleAudioPause = () => setIsAudioPlaying(false);
  const handleAudioTimeUpdate = () => setAudioCurrentTime(audioRef.current?.currentTime || 0);
  const handleAudioMetadata = () => {
    const duration = audioRef.current?.duration || 0;
    setAudioDuration(Number.isFinite(duration) ? duration : 0);
    setAudioCurrentTime(audioRef.current?.currentTime || 0);
    setAudioError(false);
  };
  const handleAudioError = () => {
    setIsAudioPlaying(false);
    setAudioError(true);
  };

  // 5. Favorites
  const [favorites, setFavorites] = useState<string[]>([]);
  const [audioFavorites, setAudioFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const trackIds = new Set((settings.musicLibrary || []).filter((track) => track.enabled).map((track) => track.id));
    const migrated = getAudioFavorites().filter((id) => trackIds.has(id));
    replaceAudioFavorites(migrated);
    setAudioFavorites(migrated);
  }, [settings.musicLibrary, isLoading]);

  const isFavorite = (storyId: string) => favorites.includes(storyId);
  const toggleBookmark = (storyId: string) => {
    const updated = toggleFavorite(storyId);
    setFavorites(updated);
  };

  const isAudioFavorite = (trackId: string) => audioFavorites.includes(trackId);
  const toggleAudioBookmark = (trackId: string) => {
    const updated = toggleAudioFavorite(trackId);
    setAudioFavorites(updated);
  };

  // 6. Data Loaders
  const refreshStories = async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (err) {
      console.error('Failed to refresh stories:', err);
    }
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [storiesData, settingsData] = await Promise.all([
          api.getStories(),
          api.getSettings(),
        ]);
        if (mounted) {
          setStories(storiesData);
          setSettings(settingsData);
        }
      } catch (err) {
        console.error('Initial data load error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <JournalContext.Provider
      value={{
        currentTheme,
        colorFamily: activeFamily,
        appearanceMode: activeAppearance,
        themeMode,
        lockedThemeId: activeFamily,
        setColorFamily,
        setAppearanceMode,
        toggleAppearanceMode,
        setThemeMode,
        selectTheme,
        applyStoryTheme,
        restoreDefaultTheme,

        language,
        setLanguage,
        t,

        currentTrack,
        audioMode,
        selectTrack,
        setAudioMode,
        applyStoryAudio,
        audioRef,
        isAudioPlaying,
        audioCurrentTime,
        audioDuration,
        audioVolume,
        audioError,
        toggleAudioPlayback,
        seekAudio,
        setAudioVolume,
        handleAudioPlay,
        handleAudioPause,
        handleAudioTimeUpdate,
        handleAudioMetadata,
        handleAudioError,

        favorites,
        isFavorite,
        toggleBookmark,

        audioFavorites,
        isAudioFavorite,
        toggleAudioBookmark,

        stories,
        settings,
        isLoading,
        refreshStories,
        updateSettings,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return ctx;
}
