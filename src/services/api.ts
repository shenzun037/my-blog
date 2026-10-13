import { Story, SiteSettings, ContactMessage, MusicTrack } from '../types/journal';
import { INITIAL_STORIES, INITIAL_SETTINGS } from '../constants/initialData';

const TOKEN_KEY = 'shenzun_admin_token';
const STORY_FAVORITES_KEY = 'shenzun_saved_stories';
const AUDIO_FAVORITES_KEY = 'shenzun_saved_audio_tracks';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

// Separate story favorites and audio favorites to eliminate data collision
export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORY_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(storyId: string): string[] {
  try {
    const current = getFavorites();
    const updated = current.includes(storyId)
      ? current.filter((id) => id !== storyId)
      : [...current, storyId];
    localStorage.setItem(STORY_FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getAudioFavorites(): string[] {
  try {
    const raw = localStorage.getItem(AUDIO_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleAudioFavorite(trackId: string): string[] {
  try {
    const current = getAudioFavorites();
    const updated = current.includes(trackId)
      ? current.filter((id) => id !== trackId)
      : [...current, trackId];
    localStorage.setItem(AUDIO_FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function replaceAudioFavorites(trackIds: string[]): void {
  try {
    localStorage.setItem(AUDIO_FAVORITES_KEY, JSON.stringify(trackIds));
  } catch {
    // ignore unavailable local storage
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // PUBLIC Stories - strictly published only, never drafts
  async getStories(): Promise<Story[]> {
    try {
      const res = await fetch('/api/stories');
      if (!res.ok) throw new Error('Failed to fetch stories');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('API fetch stories failed, using published fallback', err);
      return INITIAL_STORIES.filter((s) => s.isPublished);
    }
  },

  // PUBLIC Story Detail
  async getStory(slug: string): Promise<Story | null> {
    try {
      const res = await fetch(`/api/stories/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch story');
      return await res.json();
    } catch {
      const fallback = INITIAL_STORIES.find(
        (s) => s.isPublished && (s.slug === slug || s.id === slug)
      );
      return fallback || null;
    }
  },

  // ADMIN-ONLY Stories: drafts & published for CMS
  async getAdminStories(): Promise<Story[]> {
    const res = await fetch('/api/admin/stories', { headers: getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to fetch administrative stories');
    }
    return await res.json();
  },

  async getAdminStory(id: string): Promise<Story> {
    const res = await fetch(`/api/admin/stories/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch story detail');
    return await res.json();
  },

  async createStory(story: Partial<Story>): Promise<Story> {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(story),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create story');
    }
    return await res.json();
  },

  async updateStory(id: string, story: Partial<Story>): Promise<Story> {
    const res = await fetch(`/api/stories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(story),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update story');
    }
    return await res.json();
  },

  async deleteStory(id: string): Promise<boolean> {
    const res = await fetch(`/api/stories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete story');
    return true;
  },

  async getSettings(): Promise<SiteSettings> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return await res.json();
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    return await res.json();
  },

  async sendMessage(msg: {
    name?: string;
    email?: string;
    subject?: string;
    message: string;
    isAnonymous?: boolean;
  }): Promise<{ success: boolean; id: string; deliveryStatus: string; message: string }> {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to deliver message');
    }
    return data;
  },

  async getMessages(): Promise<(ContactMessage & { deliveryStatus: string; errorLog?: string })[]> {
    const res = await fetch('/api/messages', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return await res.json();
  },

  async markMessageRead(id: string): Promise<boolean> {
    const res = await fetch(`/api/messages/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return res.ok;
  },

  async retryMessage(id: string): Promise<{ success: boolean; deliveryStatus: string; message: string }> {
    const res = await fetch(`/api/messages/${id}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async deleteMessage(id: string): Promise<boolean> {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
  },

  async uploadMedia(data: {
    filename: string;
    base64Data: string;
    mimeType: string;
    alt?: string;
    caption?: string;
  }): Promise<{ success: boolean; url: string; filename: string }> {
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Upload failed');
    return result;
  },

  async uploadMusic(file: File): Promise<MusicTrack> {
    const token = getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'audio/mpeg' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const params = new URLSearchParams({ filename: file.name });
    const res = await fetch(`/api/music/upload?${params.toString()}`, {
      method: 'POST',
      headers,
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'MP3 upload failed.');
    return data as MusicTrack;
  },

  async deleteMusicArtwork(url: string): Promise<void> {
    const res = await fetch('/api/music-artwork', {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not remove unused album artwork.');
  },

  async deleteMusic(id: string): Promise<void> {
    const res = await fetch(`/api/music/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not remove this MP3.');
  },

  async getMedia(): Promise<any[]> {
    const res = await fetch('/api/media', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },

  async login(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setStoredToken(data.token);
        return { success: true, token: data.token };
      }
      return { success: false, error: data.error || 'Incorrect passcode' };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {}
    setStoredToken(null);
  },

  async checkAuth(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.authenticated);
    } catch {
      return false;
    }
  },
};
