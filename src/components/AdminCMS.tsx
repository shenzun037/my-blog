import React, { useState, useEffect } from 'react';
import {
  Lock,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Mail,
  Settings as SettingsIcon,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Image as ImageIcon,
  Quote,
  AlignLeft,
  List,
  Compass,
  Music2,
  Search,
} from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { api, getStoredToken } from '../services/api';
import { Story, StoryType, MoodType, ThemeId, ContentBlock, ContactMessage, MusicTrack } from '../types/journal';
import { THEMES } from '../constants/themes';
import { getMusicTitleFromFilename, getMusicTrackLabel, MAX_MUSIC_ARTWORK_UPLOAD_BYTES, MAX_MUSIC_UPLOAD_BYTES } from '../services/musicLibrary';
import { MusicArtwork } from './MusicArtwork';

export const AdminCMS: React.FC<{
  onClose: () => void;
  onSelectStoryForPreview?: (story: Story) => void;
}> = ({ onClose, onSelectStoryForPreview }) => {
  const { stories, refreshStories, settings, updateSettings, t, language, selectTrack } = useJournal();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stories' | 'editor' | 'music' | 'messages' | 'settings'>('dashboard');

  // Story Editor state
  const [editingStory, setEditingStory] = useState<Partial<Story> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicArtworkFile, setMusicArtworkFile] = useState<File | null>(null);
  const [musicArtworkPreviewUrl, setMusicArtworkPreviewUrl] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [musicSearch, setMusicSearch] = useState('');
  const [musicError, setMusicError] = useState('');
  const [musicSuccess, setMusicSuccess] = useState('');
  const [isSavingMusic, setIsSavingMusic] = useState(false);
  const [savingArtworkTrackId, setSavingArtworkTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (!musicArtworkFile) {
      setMusicArtworkPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(musicArtworkFile);
    setMusicArtworkPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [musicArtworkFile]);

  // Check auth token
  useEffect(() => {
    async function verify() {
      const token = getStoredToken();
      if (token) {
        const authed = await api.checkAuth();
        setIsAuthenticated(authed);
      }
    }
    verify();
  }, []);

  // Fetch messages if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.getMessages().then(setMessages).catch(console.error);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await api.login(passcode);
    if (res.success) {
      setIsAuthenticated(true);
      setPasscode('');
      refreshStories();
    } else {
      setLoginError(t.admin.invalidPasscode);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  // Quick preset sample images
  const PRESET_IMAGES = [
    { label: 'Tokyo Window Sunset', url: '/images/sunset_city_window_1791865686513.jpg' },
    { label: 'Sparkling Ocean Ripples', url: '/images/golden_ocean_sparkle_1791865686878.jpg' },
    { label: 'Sleeping Cat & Flowers', url: '/images/cozy_cat_flowers_1791865687426.jpg' },
    { label: 'Rainy Night Street', url: '/images/moody_rainy_street_1791865687722.jpg' },
    { label: 'Anime Lofi Headphones', url: '/images/anime_lofi_headphones_1791865687097.jpg' },
    { label: 'Mount Fuji River', url: '/images/mount_fuji_spring_1791865727235.jpg' },
  ];

  const musicLibrary = settings.musicLibrary || [];
  const filteredMusicLibrary = musicLibrary.filter((track) =>
    `${track.title || ''} ${track.artist || ''} ${track.filename}`.toLowerCase().includes(musicSearch.trim().toLowerCase())
  );

  const handleArtworkFileChange = (file: File | null, input: HTMLInputElement) => {
    setMusicError('');
    if (!file) {
      setMusicArtworkFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMusicArtworkFile(null);
      input.value = '';
      setMusicError(t.music.invalidArtwork);
      return;
    }
    if (file.size > MAX_MUSIC_ARTWORK_UPLOAD_BYTES) {
      setMusicArtworkFile(null);
      input.value = '';
      setMusicError(t.music.artworkTooLarge);
      return;
    }
    setMusicArtworkFile(file);
  };

  const openStoryForEditing = (story: Story) => {
    const soundtrack = story.soundtrack && musicLibrary.some((track) => track.id === story.soundtrack?.trackId && track.enabled)
      ? story.soundtrack
      : null;
    setEditingStory({ ...story, soundtrack });
    setActiveTab('editor');
  };

  const uploadMusic = async (attachToStory: boolean) => {
    if (!musicFile || (attachToStory && !editingStory)) return;
    if (!musicFile.name.toLowerCase().endsWith('.mp3')) {
      setMusicError(t.music.invalidMp3);
      setMusicSuccess('');
      return;
    }
    if (musicFile.size > MAX_MUSIC_UPLOAD_BYTES) {
      setMusicError(t.music.uploadTooLarge);
      setMusicSuccess('');
      return;
    }
    if (musicArtworkFile && !['image/jpeg', 'image/png', 'image/webp'].includes(musicArtworkFile.type)) {
      setMusicError(t.music.invalidArtwork);
      setMusicSuccess('');
      return;
    }
    if (musicArtworkFile && musicArtworkFile.size > MAX_MUSIC_ARTWORK_UPLOAD_BYTES) {
      setMusicError(t.music.artworkTooLarge);
      setMusicSuccess('');
      return;
    }
    setIsSavingMusic(true);
    setMusicError('');
    setMusicSuccess('');
    let uploaded: MusicTrack | null = null;
    let uploadedArtworkUrl: string | null = null;
    try {
      uploaded = await api.uploadMusic(musicFile);
      if (musicArtworkFile) {
        const artwork = await api.uploadMedia({
          file: musicArtworkFile,
          alt: musicTitle.trim() || getMusicTitleFromFilename(musicFile.name),
          caption: musicArtist.trim() || undefined,
        });
        uploadedArtworkUrl = artwork.url;
      }
      const track: MusicTrack = {
        ...uploaded,
        title: musicTitle.trim() || getMusicTitleFromFilename(uploaded.filename),
        artist: musicArtist.trim() || undefined,
        artworkUrl: uploadedArtworkUrl || undefined,
      };
      const nextLibrary = [...musicLibrary, track];
      await updateSettings({ musicLibrary: nextLibrary });
      if (attachToStory && editingStory) {
        setEditingStory({
          ...editingStory,
          soundtrack: { trackId: track.id, enabled: true, onEnter: 'select' },
        });
      } else {
        setMusicSuccess(t.music.uploadedToLibrary);
      }
      setMusicFile(null);
      setMusicArtworkFile(null);
      setMusicTitle('');
      setMusicArtist('');
      for (const id of ['story-mp3-upload', 'music-library-upload', 'story-music-artwork-upload', 'music-library-artwork-upload']) {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.value = '';
      }
    } catch (error) {
      if (uploaded) await api.deleteMusic(uploaded.id).catch(() => undefined);
      if (uploadedArtworkUrl) await api.deleteMusicArtwork(uploadedArtworkUrl).catch(() => undefined);
      setMusicError(error instanceof Error ? error.message : t.music.uploadFailed);
    } finally {
      setIsSavingMusic(false);
    }
  };

  const updateMusicArtwork = async (track: MusicTrack, file: File, input: HTMLInputElement) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMusicError(t.music.invalidArtwork);
      input.value = '';
      return;
    }
    if (file.size > MAX_MUSIC_ARTWORK_UPLOAD_BYTES) {
      setMusicError(t.music.artworkTooLarge);
      input.value = '';
      return;
    }
    setSavingArtworkTrackId(track.id);
    setMusicError('');
    let uploadedArtworkUrl: string | null = null;
    try {
      const artwork = await api.uploadMedia({
        file,
        alt: getMusicTrackLabel(track),
        caption: track.artist,
      });
      uploadedArtworkUrl = artwork.url;
      const nextLibrary = musicLibrary.map((item) => item.id === track.id ? { ...item, artworkUrl: artwork.url } : item);
      await updateSettings({ musicLibrary: nextLibrary });
      if (track.artworkUrl) await api.deleteMusicArtwork(track.artworkUrl).catch(() => undefined);
      setMusicSuccess(t.music.artworkUpdated);
    } catch (error) {
      if (uploadedArtworkUrl) await api.deleteMusicArtwork(uploadedArtworkUrl).catch(() => undefined);
      setMusicError(error instanceof Error ? error.message : t.music.artworkFailed);
    } finally {
      input.value = '';
      setSavingArtworkTrackId(null);
    }
  };

  const removeMusicTrack = async (track: MusicTrack) => {
    if (!window.confirm(t.music.removeConfirm)) return;
    setMusicError('');
    try {
      await api.deleteMusic(track.id);
      if (track.artworkUrl) await api.deleteMusicArtwork(track.artworkUrl).catch(() => undefined);
      await updateSettings({ musicLibrary: musicLibrary.filter((item) => item.id !== track.id) });
      if (editingStory?.soundtrack?.trackId === track.id) setEditingStory({ ...editingStory, soundtrack: null });
      await refreshStories();
    } catch (error) {
      console.error('Failed to remove uploaded MP3', error);
      setMusicError(error instanceof Error ? error.message : t.music.removeFailed);
    }
  };

  const handleStartNewStory = () => {
    setEditingStory({
      id: `story-${Date.now()}`,
      slug: `story-${Date.now()}`,
      title: { en: 'New Memory', th: 'เรื่องราวใหม่' },
      excerpt: { en: '', th: '' },
      type: 'photo',
      mood: 'peaceful',
      themeId: 'dreamy',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      location: 'Tokyo',
      tags: ['Reflections'],
      isFeatured: false,
      isPublished: true,
      readingTimeMinutes: 2,
      contentBlocks: [
        {
          id: `b-${Date.now()}-1`,
          type: 'paragraph',
          textEn: 'Begin your story here...',
          textTh: 'เริ่มต้นบันทึกเรื่องราวของคุณตรงนี้...',
        },
      ],
    });
    setActiveTab('editor');
  };

  const handleSaveStory = async () => {
    if (!editingStory || !editingStory.title?.en) return;
    if (editingStory.soundtrack?.trackId && !musicLibrary.some((track) => track.id === editingStory.soundtrack?.trackId && track.enabled)) {
      setMusicError(t.music.invalidMp3);
      return;
    }
    setIsSaving(true);
    try {
      if (stories.some((s) => s.id === editingStory.id)) {
        await api.updateStory(editingStory.id!, editingStory);
      } else {
        await api.createStory(editingStory);
      }
      await refreshStories();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save story', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      await api.deleteStory(id);
      await refreshStories();
      setDeletingId(null);
      if (editingStory?.id === id) {
        setEditingStory(null);
        setActiveTab('stories');
      }
    } catch (err) {
      console.error('Failed to delete story', err);
    }
  };

  const addContentBlock = (type: ContentBlock['type']) => {
    if (!editingStory) return;
    const newBlock: ContentBlock = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      textEn: type === 'paragraph' ? 'A quiet reflection...' : '',
      textTh: type === 'paragraph' ? 'ความคิดที่เงียบสงบ...' : '',
      itemsEn: type === 'noteList' ? ['Item 1', 'Item 2', 'Item 3'] : undefined,
      itemsTh: type === 'noteList' ? ['ข้อที่ 1', 'ข้อที่ 2', 'ข้อที่ 3'] : undefined,
    };
    setEditingStory({
      ...editingStory,
      contentBlocks: [...(editingStory.contentBlocks || []), newBlock],
    });
  };

  const updateBlock = (idx: number, updated: Partial<ContentBlock>) => {
    if (!editingStory || !editingStory.contentBlocks) return;
    const blocks = [...editingStory.contentBlocks];
    blocks[idx] = { ...blocks[idx], ...updated };
    setEditingStory({ ...editingStory, contentBlocks: blocks });
  };

  const removeBlock = (idx: number) => {
    if (!editingStory || !editingStory.contentBlocks) return;
    const blocks = editingStory.contentBlocks.filter((_, i) => i !== idx);
    setEditingStory({ ...editingStory, contentBlocks: blocks });
  };

  // IF NOT AUTHENTICATED: SHOW CLEAN STUDIO LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-2xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            {t.admin.loginTitle}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 font-light leading-relaxed">
            {t.admin.loginSubtitle}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={t.admin.passcodePlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Back to Site
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                {t.admin.loginButton}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 text-[11px] text-neutral-400 font-mono">
            Configured via ADMIN_PASSCODE in .env (default: <span className="font-semibold text-neutral-600 dark:text-neutral-300">shenzun2025</span>)
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED STUDIO INTERFACE
  const publishedCount = stories.filter((s) => s.isPublished).length;
  const draftCount = stories.filter((s) => !s.isPublished).length;
  const unreadMessagesCount = messages.filter((m) => !m.read).length;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Studio Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-black/10 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/80 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg font-medium text-neutral-900 dark:text-neutral-100">
            {t.admin.title}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Connected
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex w-full flex-wrap items-center justify-center gap-1 rounded-xl bg-black/5 p-1 text-[10px] dark:bg-white/5 sm:text-xs lg:w-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-lg px-2 py-1.5 font-medium transition-colors sm:px-3 ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-neutral-800 shadow-xs text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.admin.dashboard}
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`rounded-lg px-2 py-1.5 font-medium transition-colors sm:px-3 ${
              activeTab === 'stories'
                ? 'bg-white dark:bg-neutral-800 shadow-xs text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.admin.stories} ({stories.length})
          </button>
          <button
            onClick={handleStartNewStory}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium transition-colors sm:px-3 ${
              activeTab === 'editor'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.admin.newStory}</span>
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium transition-colors sm:px-3 ${
              activeTab === 'music'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Music2 className="h-3.5 w-3.5" />
            {t.music.libraryTab}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`relative rounded-lg px-2 py-1.5 font-medium transition-colors sm:px-3 ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-800 shadow-xs text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.admin.messages}
            {unreadMessagesCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {unreadMessagesCount}
              </span>
            )}
          </button>
        </div>

        {/* Exit / Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Exit Studio
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
            title={t.admin.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 shadow-xs">
                <span className="text-[11px] font-mono uppercase text-neutral-400">
                  {t.admin.stats.total}
                </span>
                <div className="text-3xl font-serif mt-2 font-normal">
                  {stories.length}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 shadow-xs">
                <span className="text-[11px] font-mono uppercase text-neutral-400">
                  {t.admin.stats.published}
                </span>
                <div className="text-3xl font-serif mt-2 font-normal text-emerald-600 dark:text-emerald-400">
                  {publishedCount}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 shadow-xs">
                <span className="text-[11px] font-mono uppercase text-neutral-400">
                  {t.admin.stats.drafts}
                </span>
                <div className="text-3xl font-serif mt-2 font-normal text-amber-600 dark:text-amber-400">
                  {draftCount}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 shadow-xs">
                <span className="text-[11px] font-mono uppercase text-neutral-400">
                  {t.admin.stats.messages}
                </span>
                <div className="text-3xl font-serif mt-2 font-normal text-indigo-600 dark:text-indigo-400">
                  {messages.length}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <h3 className="font-serif text-xl font-normal text-neutral-900 dark:text-neutral-100">
                Recent Stories
              </h3>
              <button
                onClick={handleStartNewStory}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Story</span>
              </button>
            </div>

            <div className="space-y-3">
              {stories.slice(0, 6).map((story) => (
                <div
                  key={story.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {story.coverImage && (
                      <img
                        src={story.coverImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-serif text-base font-medium truncate">
                        {story.title.en}
                      </h4>
                      <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>{story.date}</span>
                        <span>·</span>
                        <span className="capitalize">{story.type}</span>
                        <span>·</span>
                        <span>{story.isPublished ? 'Published' : 'Draft'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        openStoryForEditing(story);
                      }}
                      className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Edit Story"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {deletingId === story.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-medium hover:bg-rose-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 text-[11px] hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(story.id)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Story"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. STORIES LIST TAB */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-normal">
                Story Library ({stories.length})
              </h3>
              <button
                onClick={handleStartNewStory}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Story</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                      <span className="font-mono">{story.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                        story.isPublished ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {story.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h4 className="font-serif text-lg font-medium mb-1">
                      {story.title.en}
                    </h4>
                    {story.title.th && (
                      <p className="text-xs text-neutral-400 mb-2">
                        {story.title.th}
                      </p>
                    )}
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 font-light">
                      {story.excerpt?.en}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 capitalize">
                      {story.type} · {story.mood}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          openStoryForEditing(story);
                        }}
                        className="px-3 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      >
                        Edit
                      </button>
                      {deletingId === story.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-medium hover:bg-rose-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 rounded bg-black/10 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 text-[10px] hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(story.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. STORY EDITOR TAB */}
        {activeTab === 'editor' && editingStory && (
          <div className="space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="font-serif text-2xl font-normal">
                  {stories.some((s) => s.id === editingStory.id) ? 'Edit Story' : 'Compose New Story'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Configure bilingual text, atmospheric theme, and content blocks.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </span>
                )}
                <button
                  onClick={handleSaveStory}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10">
              {/* Title EN */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={editingStory.title?.en || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      title: { ...(editingStory.title || { en: '', th: '' }), en: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Title TH */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Title (Thai / ภาษาไทย)
                </label>
                <input
                  type="text"
                  value={editingStory.title?.th || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      title: { ...(editingStory.title || { en: '', th: '' }), th: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Excerpt EN */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Excerpt (English)
                </label>
                <textarea
                  rows={2}
                  value={editingStory.excerpt?.en || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      excerpt: { ...(editingStory.excerpt || { en: '', th: '' }), en: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Excerpt TH */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Excerpt (Thai)
                </label>
                <textarea
                  rows={2}
                  value={editingStory.excerpt?.th || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      excerpt: { ...(editingStory.excerpt || { en: '', th: '' }), th: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Type & Mood */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Story Type
                </label>
                <select
                  value={editingStory.type || 'photo'}
                  onChange={(e) =>
                    setEditingStory({ ...editingStory, type: e.target.value as StoryType })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                >
                  <option value="photo">Photo Story (with photo cover)</option>
                  <option value="quote">Quote Only (minimalist typography)</option>
                  <option value="note">Note / List of small joys</option>
                  <option value="diary">Diary Entry (long form)</option>
                  <option value="anime">Anime / Meme screenshot</option>
                  <option value="mixed">Mixed Media</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Mood / Atmosphere
                </label>
                <select
                  value={editingStory.mood || 'peaceful'}
                  onChange={(e) =>
                    setEditingStory({ ...editingStory, mood: e.target.value as MoodType })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                >
                  <option value="peaceful">Peaceful (สงบ)</option>
                  <option value="melancholy">Melancholy (หม่นเศร้า)</option>
                  <option value="nostalgic">Nostalgic (หวนคิดถึง)</option>
                  <option value="happy">Happy (สดใส)</option>
                  <option value="thoughtful">Thoughtful (ครุ่นคิด)</option>
                  <option value="playful">Playful (สนุกสนาน)</option>
                </select>
              </div>

              {/* Theme & Audio Soundtrack */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Assigned Theme
                </label>
                <select
                  value={editingStory.themeId || 'dreamy'}
                  onChange={(e) =>
                    setEditingStory({ ...editingStory, themeId: e.target.value as ThemeId })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                >
                  {Object.keys(THEMES).map((id) => (
                    <option key={id} value={id}>
                      {THEMES[id as ThemeId].name}
                    </option>
                  ))}
                </select>
              </div>

              <section className="md:col-span-2 rounded-2xl border theme-border theme-surface-raised p-4 space-y-4" aria-labelledby="story-soundtrack-heading">
                <div>
                  <h3 id="story-soundtrack-heading" className="flex items-center gap-2 text-xs font-semibold theme-text-primary"><Music2 className="h-4 w-4 theme-accent" />{t.music.storySoundtrack}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed theme-text-muted">{t.music.uploadHint}</p>
                </div>

                <label className="block text-[10px] font-mono uppercase theme-text-muted">
                  {t.music.chooseMp3}
                  <input id="story-mp3-upload" type="file" accept=".mp3,audio/mpeg" onChange={(event) => { const file = event.target.files?.[0] || null; setMusicFile(file); if (file) setMusicTitle(getMusicTitleFromFilename(file.name)); setMusicError(''); setMusicSuccess(''); }} className="mt-1 block min-h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 p-2 text-xs normal-case text-neutral-900 dark:text-neutral-100 file:mr-3 file:rounded-lg file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-[10px] dark:file:bg-white/10 dark:file:text-neutral-100" />
                </label>
                {musicFile && <p className="text-[11px] theme-text-secondary" role="status">{musicFile.name} · {(musicFile.size / (1024 * 1024)).toFixed(1)} MB</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.titleFromFilename}<input maxLength={200} value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 px-3 text-xs normal-case text-neutral-900 dark:text-neutral-100" /></label>
                  <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.optionalArtist}<input maxLength={200} value={musicArtist} onChange={(event) => setMusicArtist(event.target.value)} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 px-3 text-xs normal-case text-neutral-900 dark:text-neutral-100" /></label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <MusicArtwork artworkUrl={musicArtworkPreviewUrl || undefined} alt={musicTitle || t.music.artwork} className="h-14 w-14 rounded-xl" />
                  <label className="min-w-0 flex-1 block text-[10px] font-mono uppercase theme-text-muted">{t.music.chooseArtwork}
                    <input id="story-music-artwork-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleArtworkFileChange(event.target.files?.[0] || null, event.currentTarget)} className="mt-1 block min-h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 p-2 text-xs normal-case text-neutral-900 dark:text-neutral-100 file:mr-3 file:rounded-lg file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-[10px] dark:file:bg-white/10 dark:file:text-neutral-100" />
                  </label>
                </div>
                {musicArtworkFile && <p className="text-[10px] theme-text-muted">{musicArtworkFile.name} · {(musicArtworkFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
                <button type="button" onClick={() => uploadMusic(true)} disabled={isSavingMusic || !musicFile} className="min-h-10 rounded-xl theme-accent-bg px-4 text-[11px] font-medium disabled:opacity-40">{isSavingMusic ? t.music.uploading : t.music.uploadAndAttach}</button>
                {musicError && <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-300">{musicError}</p>}
                {musicSuccess && <p role="status" className="text-[11px] text-emerald-700 dark:text-emerald-300">{musicSuccess}</p>}

                <div className="space-y-3 border-t theme-border pt-3">
                  <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.attached}
                    <select value={editingStory.soundtrack?.trackId || ''} onChange={(event) => {
                      const selected = musicLibrary.find((track) => track.id === event.target.value);
                      setEditingStory({ ...editingStory, soundtrack: selected ? { trackId: selected.id, enabled: true, onEnter: 'select' } : null });
                    }} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 px-3 text-xs normal-case text-neutral-900 dark:text-neutral-100">
                      <option value="">{t.music.notAttached}</option>
                      {musicLibrary.filter((track) => track.enabled).map((track) => <option key={track.id} value={track.id}>{getMusicTrackLabel(track)}</option>)}
                    </select>
                  </label>
                  {editingStory.soundtrack?.trackId && (
                    <>
                      <label className="flex min-h-9 items-center gap-2 text-[11px] theme-text-secondary"><input type="checkbox" checked={editingStory.soundtrack.enabled} onChange={(event) => setEditingStory({ ...editingStory, soundtrack: { ...editingStory.soundtrack!, enabled: event.target.checked } })} />{language === 'th' ? 'แสดงเพลงนี้เป็นตัวเลือกในเรื่อง' : 'Offer this soundtrack on the story'}</label>
                      <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.onEnter}<select value={editingStory.soundtrack.onEnter} onChange={(event) => setEditingStory({ ...editingStory, soundtrack: { ...editingStory.soundtrack!, onEnter: event.target.value as 'select' | 'manual' } })} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 dark:bg-white/5 px-2 text-[11px] normal-case text-neutral-900 dark:text-neutral-100"><option value="select">{t.music.selectOnEnter}</option><option value="manual">{t.music.manualOnEnter}</option></select></label>
                      <button type="button" onClick={() => setEditingStory({ ...editingStory, soundtrack: null })} className="min-h-9 text-[11px] text-rose-600 underline underline-offset-2 dark:text-rose-300">{t.music.clearAssociation}</button>
                    </>
                  )}
                </div>

                <div className="space-y-2 border-t theme-border pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-[11px] font-semibold theme-text-primary">{t.music.library} ({musicLibrary.length})</h4>
                    <div className="flex gap-2">
                      <label className="relative"><Search className="absolute left-2 top-2.5 h-3 w-3 theme-text-muted" /><input value={musicSearch} onChange={(event) => setMusicSearch(event.target.value)} placeholder={t.music.search} className="h-8 w-44 rounded-lg border theme-border bg-black/5 dark:bg-white/5 pl-7 pr-2 text-[10px]" /></label>
                    </div>
                  </div>
                  {filteredMusicLibrary.length === 0 ? <p className="py-3 text-center text-[11px] theme-text-muted">{musicLibrary.length ? t.music.noResults : t.music.adminEmpty}</p> : (
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {filteredMusicLibrary.map((track) => (
                        <div key={track.id} className="flex flex-wrap items-center gap-2 rounded-xl border theme-border p-2">
                          <MusicArtwork artworkUrl={track.artworkUrl} alt={getMusicTrackLabel(track)} className="h-11 w-11 rounded-lg" />
                          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium theme-text-primary">{getMusicTrackLabel(track)}</p><p className="truncate text-[10px] theme-text-muted">{track.artist || t.music.mp3File} · {(track.size / (1024 * 1024)).toFixed(1)} MB</p></div>
                          <button type="button" onClick={() => setEditingStory({ ...editingStory, soundtrack: { trackId: track.id, enabled: true, onEnter: 'select' } })} className="min-h-8 rounded-lg border theme-border px-2 text-[10px] hover:bg-black/5 dark:hover:bg-white/5">{t.music.reuse}</button>
                          <button type="button" onClick={() => selectTrack(track)} className="min-h-8 rounded-lg border theme-border px-2 text-[10px] hover:bg-black/5 dark:hover:bg-white/5">{t.music.preview}</button>
                          <button type="button" onClick={() => removeMusicTrack(track)} className="min-h-8 rounded-lg px-2 text-[10px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-300">{t.music.remove}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Date & Location */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Display Date (e.g. Apr 14, 2025)
                </label>
                <input
                  type="text"
                  value={editingStory.date || ''}
                  onChange={(e) => setEditingStory({ ...editingStory, date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Location (e.g. Tokyo, Kyoto, Chiang Mai)
                </label>
                <input
                  type="text"
                  value={editingStory.location || ''}
                  onChange={(e) => setEditingStory({ ...editingStory, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Cover Image & Presets */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={editingStory.coverImage || ''}
                  onChange={(e) => setEditingStory({ ...editingStory, coverImage: e.target.value })}
                  placeholder="/images/sunset_city_window_1791865686513.jpg"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-neutral-400 self-center mr-1">Presets:</span>
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setEditingStory({ ...editingStory, coverImage: img.url })}
                      className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[10px] hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Quote (for handwritten quote on photo) */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Overlay Handwritten Quote (English)
                </label>
                <input
                  type="text"
                  value={editingStory.overlayQuote?.en || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      overlayQuote: { ...(editingStory.overlayQuote || {}), en: e.target.value },
                    })
                  }
                  placeholder="Some days just feel softer."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Overlay Handwritten Quote (Thai)
                </label>
                <input
                  type="text"
                  value={editingStory.overlayQuote?.th || ''}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      overlayQuote: { ...(editingStory.overlayQuote || {}), th: e.target.value },
                    })
                  }
                  placeholder="บางวัน...ก็แค่รู้สึกนุ่มนวลกว่าที่เคย"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 md:col-span-2 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStory.isPublished || false}
                    onChange={(e) =>
                      setEditingStory({ ...editingStory, isPublished: e.target.checked })
                    }
                    className="rounded text-amber-600 h-4 w-4"
                  />
                  <span>Published publicly</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStory.isFeatured || false}
                    onChange={(e) =>
                      setEditingStory({ ...editingStory, isFeatured: e.target.checked })
                    }
                    className="rounded text-amber-600 h-4 w-4"
                  />
                  <span>Featured on front page</span>
                </label>
              </div>
            </div>

            {/* Content Blocks Builder */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <h4 className="font-serif text-lg font-normal">Content Blocks</h4>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addContentBlock('paragraph')}
                    className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <AlignLeft className="w-3 h-3" />
                    <span>+ Paragraph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('quote')}
                    className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <Quote className="w-3 h-3" />
                    <span>+ Quote</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('image')}
                    className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>+ Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContentBlock('noteList')}
                    className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <List className="w-3 h-3" />
                    <span>+ Note List</span>
                  </button>
                </div>
              </div>

              {/* List of blocks */}
              <div className="space-y-4">
                {editingStory.contentBlocks?.map((block, idx) => (
                  <div
                    key={block.id}
                    className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-mono text-[10px] uppercase">
                        Block {idx + 1}: {block.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="text-neutral-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {block.type === 'paragraph' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <textarea
                          rows={3}
                          value={block.textEn || ''}
                          onChange={(e) => updateBlock(idx, { textEn: e.target.value })}
                          placeholder="Paragraph text in English..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                        />
                        <textarea
                          rows={3}
                          value={block.textTh || ''}
                          onChange={(e) => updateBlock(idx, { textTh: e.target.value })}
                          placeholder="ข้อความย่อหน้าภาษาไทย..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                        />
                      </div>
                    )}

                    {block.type === 'quote' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={block.textEn || ''}
                          onChange={(e) => updateBlock(idx, { textEn: e.target.value })}
                          placeholder="Quote in English..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-serif italic"
                        />
                        <input
                          type="text"
                          value={block.textTh || ''}
                          onChange={(e) => updateBlock(idx, { textTh: e.target.value })}
                          placeholder="คำคมภาษาไทย..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-serif italic"
                        />
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={block.imageUrl || ''}
                          onChange={(e) => updateBlock(idx, { imageUrl: e.target.value })}
                          placeholder="Image URL..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={block.captionEn || ''}
                            onChange={(e) => updateBlock(idx, { captionEn: e.target.value })}
                            placeholder="Caption (English)..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                          />
                          <input
                            type="text"
                            value={block.captionTh || ''}
                            onChange={(e) => updateBlock(idx, { captionTh: e.target.value })}
                            placeholder="คำบรรยายภาพ (ไทย)..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'noteList' && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-400">List Items (one per line):</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <textarea
                            rows={4}
                            value={block.itemsEn?.join('\n') || ''}
                            onChange={(e) =>
                              updateBlock(idx, { itemsEn: e.target.value.split('\n') })
                            }
                            placeholder="1. Coffee&#10;2. Sunset&#10;3. Peace"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                          />
                          <textarea
                            rows={4}
                            value={block.itemsTh?.join('\n') || ''}
                            onChange={(e) =>
                              updateBlock(idx, { itemsTh: e.target.value.split('\n') })
                            }
                            placeholder="1. กาแฟอุ่น&#10;2. แสงยามเย็น&#10;3. ความสงบ"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MP3 LIBRARY TAB: upload files without linking them to a story */}
        {activeTab === 'music' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-2xl font-normal">
                <Music2 className="h-5 w-5 theme-accent" />
                {t.music.libraryTab}
                <span className="font-sans text-sm text-neutral-400">({musicLibrary.length})</span>
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{t.music.uploadOnlyHint}</p>
            </div>

            <section className="rounded-2xl border theme-border bg-white p-4 shadow-xs dark:bg-neutral-900 sm:p-5" aria-labelledby="music-library-upload-heading">
              <h3 id="music-library-upload-heading" className="text-sm font-semibold">{t.music.uploadOnlyTitle}</h3>
              <div className="mt-4 space-y-3">
                <label className="block text-[10px] font-mono uppercase theme-text-muted">
                  {t.music.chooseMp3}
                  <input id="music-library-upload" type="file" accept=".mp3,audio/mpeg" onChange={(event) => { const file = event.target.files?.[0] || null; setMusicFile(file); if (file) setMusicTitle(getMusicTitleFromFilename(file.name)); setMusicError(''); setMusicSuccess(''); }} className="mt-1 block min-h-10 w-full rounded-xl border theme-border bg-black/5 p-2 text-xs normal-case text-neutral-900 dark:bg-white/5 dark:text-neutral-100 file:mr-3 file:rounded-lg file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-[10px] dark:file:bg-white/10 dark:file:text-neutral-100" />
                </label>
                {musicFile && <p className="text-[11px] theme-text-secondary" role="status">{musicFile.name} · {(musicFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.titleFromFilename}<input maxLength={200} value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 px-3 text-xs normal-case text-neutral-900 dark:bg-white/5 dark:text-neutral-100" /></label>
                  <label className="block text-[10px] font-mono uppercase theme-text-muted">{t.music.optionalArtist}<input maxLength={200} value={musicArtist} onChange={(event) => setMusicArtist(event.target.value)} className="mt-1 h-10 w-full rounded-xl border theme-border bg-black/5 px-3 text-xs normal-case text-neutral-900 dark:bg-white/5 dark:text-neutral-100" /></label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <MusicArtwork artworkUrl={musicArtworkPreviewUrl || undefined} alt={musicTitle || t.music.artwork} className="h-14 w-14 rounded-xl" />
                  <label className="min-w-0 flex-1 block text-[10px] font-mono uppercase theme-text-muted">{t.music.chooseArtwork}
                    <input id="music-library-artwork-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleArtworkFileChange(event.target.files?.[0] || null, event.currentTarget)} className="mt-1 block min-h-10 w-full rounded-xl border theme-border bg-black/5 p-2 text-xs normal-case text-neutral-900 dark:bg-white/5 dark:text-neutral-100 file:mr-3 file:rounded-lg file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-[10px] dark:file:bg-white/10 dark:file:text-neutral-100" />
                  </label>
                </div>
                {musicArtworkFile && <p className="text-[10px] theme-text-muted">{musicArtworkFile.name} · {(musicArtworkFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
                <button type="button" onClick={() => uploadMusic(false)} disabled={isSavingMusic || !musicFile} className="min-h-10 rounded-xl theme-accent-bg px-4 text-[11px] font-medium disabled:opacity-40">{isSavingMusic ? t.music.uploading : t.music.uploadOnlyAction}</button>
                {musicError && <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-300">{musicError}</p>}
                {musicSuccess && <p role="status" className="text-[11px] text-emerald-700 dark:text-emerald-300">{musicSuccess}</p>}
              </div>
            </section>

            <section className="rounded-2xl border theme-border bg-white p-4 shadow-xs dark:bg-neutral-900 sm:p-5" aria-labelledby="music-library-list-heading">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 id="music-library-list-heading" className="text-sm font-semibold">{t.music.library} ({musicLibrary.length})</h3>
                <label className="relative block w-full sm:w-72"><Search aria-hidden="true" className="absolute left-3 top-3 h-3.5 w-3.5 theme-text-muted" /><span className="sr-only">{t.music.search}</span><input value={musicSearch} onChange={(event) => setMusicSearch(event.target.value)} placeholder={t.music.search} className="h-9 w-full rounded-lg border theme-border bg-black/5 pl-9 pr-3 text-xs dark:bg-white/5" /></label>
              </div>
              <p className="mt-2 text-[11px] theme-text-muted">{t.music.attachLaterHint}</p>
              {filteredMusicLibrary.length === 0 ? <p className="py-8 text-center text-[11px] theme-text-muted">{musicLibrary.length ? t.music.noResults : t.music.adminEmpty}</p> : (
                <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
                  {filteredMusicLibrary.map((track) => {
                    const linkedStories = stories.filter((story) => story.soundtrack?.trackId === track.id).length;
                    return (
                      <div key={track.id} className="flex flex-col gap-3 rounded-xl border theme-border p-3 sm:flex-row sm:items-center">
                        <MusicArtwork artworkUrl={track.artworkUrl} alt={getMusicTrackLabel(track)} className="h-14 w-14 rounded-lg" />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium theme-text-primary">{getMusicTrackLabel(track)}</p><p className="mt-0.5 truncate text-[10px] theme-text-muted">{track.artist || t.music.mp3File} · {(track.size / (1024 * 1024)).toFixed(1)} MB · {t.music.linkedStories(linkedStories)}</p></div>
                        <div className="flex shrink-0 gap-2">
                          <label className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border theme-border px-3 text-[10px] hover:bg-black/5 focus-within:ring-2 focus-within:ring-amber-500/60 dark:hover:bg-white/5 ${savingArtworkTrackId === track.id ? 'pointer-events-none opacity-50' : ''}`}>
                            {savingArtworkTrackId === track.id ? t.music.uploading : track.artworkUrl ? t.music.changeArtwork : t.music.addArtwork}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`${track.artworkUrl ? t.music.changeArtwork : t.music.addArtwork}: ${getMusicTrackLabel(track)}`} disabled={savingArtworkTrackId === track.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void updateMusicArtwork(track, file, event.currentTarget); }} />
                          </label>
                          <button type="button" onClick={() => selectTrack(track)} className="min-h-9 rounded-lg border theme-border px-3 text-[10px] hover:bg-black/5 dark:hover:bg-white/5">{t.music.preview}</button>
                          <button type="button" onClick={() => removeMusicTrack(track)} className="min-h-9 rounded-lg px-3 text-[10px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-300">{t.music.remove}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 4. PRIVATE INBOX TAB */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <h3 className="font-serif text-2xl font-normal">
              Private Visitor Letters ({messages.length})
            </h3>

            {messages.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-neutral-500">
                No letters in the inbox yet.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-6 rounded-2xl bg-white dark:bg-neutral-900 border transition-colors ${
                      msg.read ? 'border-black/5 dark:border-white/10' : 'border-amber-500/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <span>{msg.name}</span>
                          {msg.isAnonymous && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Anonymous
                            </span>
                          )}
                        </div>
                        {msg.email && (
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {msg.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={async () => {
                            await api.deleteMessage(msg.id);
                            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                          }}
                          className="p-1 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h5 className="font-serif text-base font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                      {msg.subject}
                    </h5>
                    <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 font-light leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
