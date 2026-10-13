export type StoryType = 'quote' | 'photo' | 'note' | 'diary' | 'anime' | 'mixed';

export type MoodType = 'melancholy' | 'nostalgic' | 'peaceful' | 'happy' | 'thoughtful' | 'playful';

/** 13 Selectable Color Families */
export type ColorFamilyId =
  | 'red'
  | 'blue'
  | 'yellow'
  | 'green'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'black'
  | 'white'
  | 'gray'
  | 'silver'
  | 'gold';

export type AppearanceMode = 'light' | 'dark';

/** A reference to an administrator-uploaded MP3 file. */
export interface MusicTrack {
  id: string;
  provider: 'mp3';
  url: string;
  filename: string;
  mimeType: 'audio/mpeg';
  size: number;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  enabled: boolean;
}

export interface StorySoundtrack {
  trackId: string;
  enabled: boolean;
  onEnter: 'select' | 'manual';
}

/** Legacy & Story theme ID compatibility */
export type ThemeId =
  | ColorFamilyId
  | 'midnight'
  | 'dreamy'
  | 'sunlit'
  | 'quiet'
  | 'nature'
  | 'playful'
  | 'auto';

/** Required Semantic Color Tokens for WCAG 2.2 AA Contrast */
export interface ThemeTokens {
  pageBg: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  link: string;
  linkHover: string;
  accent: string;
  accentHover: string;
  accentPressed: string;
  accentContrastText: string;
  border: string;
  borderStrong: string;
  focusRing: string;
  selectionBg: string;
  selectionText: string;
  overlay: string;
  inputBg: string;
  inputText: string;
  placeholder: string;
  success: string;
  warning: string;
  error: string;
}

export interface ColorFamilyConfig {
  id: ColorFamilyId;
  name: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  swatchHex: string;
  variants: {
    light: ThemeTokens;
    dark: ThemeTokens;
  };
}

export interface ThemeConfig {
  id: ThemeId;
  familyId: ColorFamilyId;
  name: string;
  nameTh: string;
  description: string;
  mode: AppearanceMode;
  tokens: ThemeTokens;
  // Legacy compatibility helpers
  bgHex: string;
  bgClass: string;
  cardBgClass: string;
  textClass: string;
  mutedTextClass: string;
  borderClass: string;
  accentHex: string;
  accentClass: string;
}

export interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'quote' | 'image' | 'gallery' | 'divider' | 'noteList';
  textEn?: string;
  textTh?: string;
  imageUrl?: string;
  captionEn?: string;
  captionTh?: string;
  alt?: string;
  layout?: 'full' | 'centered' | 'side-by-side' | 'portrait';
  images?: { url: string; caption?: string; alt?: string }[];
  itemsEn?: string[];
  itemsTh?: string[];
}

export interface Story {
  id: string;
  slug: string;
  title: {
    en: string;
    th: string;
  };
  excerpt: {
    en: string;
    th: string;
  };
  type: StoryType;
  contentBlocks: ContentBlock[];
  mood: MoodType;
  themeId: ThemeId;
  soundtrack?: StorySoundtrack | null;
  date: string; // e.g. "Apr 14, 2025"
  displayDate?: string;
  location?: string;
  coverImage?: string;
  overlayQuote?: {
    en?: string;
    th?: string;
  };
  quoteAuthor?: string;
  tags: string[];
  category?: string;
  isFeatured?: boolean;
  isPublished: boolean;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  title: string;
  subtitleEn: string;
  subtitleTh: string;
  wordmark: string;
  kickerEn: string;
  kickerTh: string;
  bioEn: string;
  bioTh: string;
  defaultLanguage: 'en' | 'th';
  defaultTheme: ThemeId;
  defaultAppearance?: AppearanceMode;
  musicLibrary: MusicTrack[];
  socialLinks: {
    discord?: string;
    instagram?: string;
    github?: string;
    email?: string;
  };
  principlesEn: string[];
  principlesTh: string[];
  authorImage: string;
  sidebarImage: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
  read: boolean;
}
