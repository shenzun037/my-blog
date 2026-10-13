import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Story, StorySoundtrack, SiteSettings, ContactMessage } from '../src/types/journal.ts';
import { INITIAL_STORIES, INITIAL_SETTINGS } from '../src/constants/initialData.ts';
import { isMusicTrack } from '../src/services/musicLibrary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'shenzun.sqlite');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
function parseStorySoundtrack(value: unknown): StorySoundtrack | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const item = JSON.parse(value);
    if (!item || typeof item.trackId !== 'string' || item.trackId.length > 200 || typeof item.enabled !== 'boolean') return undefined;
    if (!['select', 'manual'].includes(item.onEnter)) return undefined;
    return { trackId: item.trackId, enabled: item.enabled, onEnter: item.onEnter };
  } catch {
    return undefined;
  }
}

export interface SessionRecord {
  token: string;
  user_id: string;
  ip: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

export class DatabaseManager {
  private db: Database | null = null;
  private isInitialized = false;

  public async init() {
    if (this.isInitialized && this.db) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.migrateSchema();
      this.seedInitialData();
      this.saveToDisk();
    }

    // Ensure schema is up to date
    this.migrateSchema();
    this.isInitialized = true;
    this.migrateLegacyExternalMusic();
  }

  private migrateLegacyExternalMusic() {
    if (!this.db) return;
    const settingsRows = this.db.exec("SELECT value_json FROM settings WHERE key = 'main' LIMIT 1")[0]?.values;
    if (!settingsRows?.length) return;

    let settings: any;
    try {
      settings = JSON.parse(settingsRows[0][0] as string);
    } catch {
      return;
    }

    const musicLibrary = Array.isArray(settings.musicLibrary) ? settings.musicLibrary : [];
    const activeTracks = musicLibrary.filter((track: any) => isMusicTrack(track));
    const activeIds = new Set(activeTracks.map((track: any) => track.id).filter((id: unknown): id is string => typeof id === 'string'));
    const removedTracks = musicLibrary.filter((track: any) => !activeTracks.includes(track));
    const storyRows = this.db.exec('SELECT id, soundtrack_json FROM stories WHERE soundtrack_json IS NOT NULL')[0]?.values || [];
    const affectedStories: Array<{ id: string; soundtrack: unknown }> = [];
    for (const [id, rawSoundtrack] of storyRows) {
      if (typeof rawSoundtrack !== 'string') continue;
      try {
        const soundtrack = JSON.parse(rawSoundtrack);
        if (typeof soundtrack?.trackId === 'string' && !activeIds.has(soundtrack.trackId)) {
          affectedStories.push({ id: String(id), soundtrack });
        }
      } catch {}
    }

    if (removedTracks.length === 0 && affectedStories.length === 0) return;

    // Keep a recoverable copy of retired external tracks and soundtrack links before clearing them.
    const backupPath = path.join(BACKUP_DIR, `removed_external_music_${Date.now()}.json`);
    try {
      fs.writeFileSync(backupPath, JSON.stringify({ removedTracks, affectedStories, createdAt: new Date().toISOString() }, null, 2));
    } catch (error) {
      console.warn('Could not back up retired music data; migration skipped.', error);
      return;
    }

    settings.musicLibrary = activeTracks;
    this.db.run("INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES ('main', ?, ?)", [JSON.stringify(settings), new Date().toISOString()]);
    for (const story of affectedStories) {
      this.db.run('UPDATE stories SET soundtrack_json = NULL WHERE id = ?', [story.id]);
    }
    this.saveToDisk();
  }

  private saveToDisk() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, DB_PATH);
    } catch (err) {
      console.error('Failed to save SQLite database to disk:', err);
      throw err;
    }
  }

  private migrateSchema() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title_en TEXT NOT NULL,
        title_th TEXT,
        excerpt_en TEXT,
        excerpt_th TEXT,
        type TEXT NOT NULL,
        mood TEXT NOT NULL,
        theme_id TEXT NOT NULL,
        audio_track_id TEXT,
        audio_mode TEXT,
        soundtrack_json TEXT,
        date_display TEXT NOT NULL,
        location TEXT,
        cover_image TEXT,
        overlay_quote_en TEXT,
        overlay_quote_th TEXT,
        quote_author TEXT,
        category TEXT,
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 0,
        reading_time_minutes INTEGER NOT NULL DEFAULT 1,
        tags_json TEXT NOT NULL DEFAULT '[]',
        content_blocks_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug);
      CREATE INDEX IF NOT EXISTS idx_stories_published ON stories(is_published);
      CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
      CREATE INDEX IF NOT EXISTS idx_stories_mood ON stories(mood);
      CREATE INDEX IF NOT EXISTS idx_stories_type ON stories(type);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        delivery_status TEXT NOT NULL DEFAULT 'stored',
        error_log TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        alt TEXT,
        caption TEXT,
        created_at TEXT NOT NULL
      );
    `);

    const storyColumns = this.db.exec('PRAGMA table_info(stories)')[0]?.values || [];
    if (!storyColumns.some((column) => column[1] === 'soundtrack_json')) {
      this.db.run('ALTER TABLE stories ADD COLUMN soundtrack_json TEXT');
    }
    // Old audio columns only contained generated presets. Clear those stale references on migration.
    this.db.run("UPDATE stories SET audio_track_id = NULL, audio_mode = NULL WHERE soundtrack_json IS NULL");
  }

  private seedInitialData() {
    if (!this.db) return;

    // Check if JSON file exists in data directory to migrate from
    const storiesJsonPath = path.join(DATA_DIR, 'stories.json');
    let sourceStories = INITIAL_STORIES;

    if (fs.existsSync(storiesJsonPath)) {
      try {
        const raw = fs.readFileSync(storiesJsonPath, 'utf-8');
        sourceStories = JSON.parse(raw);
        // Backup old JSON file safely
        const backupPath = path.join(BACKUP_DIR, `stories_migration_${Date.now()}.json`);
        fs.writeFileSync(backupPath, raw);
      } catch (e) {
        console.warn('Failed reading existing stories.json, using defaults', e);
      }
    }

    // Insert stories
    sourceStories.forEach((s) => {
      // Normalize image paths to use /images/
      const coverImage = (s.coverImage || '').replace(/^\/src\/assets\/images\//, '/images/');
      const blocks = (s.contentBlocks || []).map((b) => ({
        ...b,
        imageUrl: b.imageUrl ? b.imageUrl.replace(/^\/src\/assets\/images\//, '/images/') : undefined,
      }));

      this.db?.run(
        `INSERT OR REPLACE INTO stories (
          id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
          theme_id, date_display, location,
          cover_image, overlay_quote_en, overlay_quote_th, quote_author,
          category, is_featured, is_published, reading_time_minutes,
          tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.slug,
          s.title.en,
          s.title.th || '',
          s.excerpt?.en || '',
          s.excerpt?.th || '',
          s.type,
          s.mood,
          s.themeId,
          s.date,
          s.location || null,
          coverImage || null,
          s.overlayQuote?.en || null,
          s.overlayQuote?.th || null,
          s.quoteAuthor || null,
          s.category || 'Journal',
          s.isFeatured ? 1 : 0,
          s.isPublished ? 1 : 0,
          s.readingTimeMinutes || 2,
          JSON.stringify(s.tags || []),
          JSON.stringify(blocks),
          s.createdAt || new Date().toISOString(),
          s.updatedAt || new Date().toISOString(),
          s.soundtrack ? JSON.stringify(s.soundtrack) : null,
        ]
      );
    });

    // Seed settings
    const settingsJsonPath = path.join(DATA_DIR, 'settings.json');
    let sourceSettings = INITIAL_SETTINGS;

    if (fs.existsSync(settingsJsonPath)) {
      try {
        const raw = fs.readFileSync(settingsJsonPath, 'utf-8');
        const parsedSettings = JSON.parse(raw);
        sourceSettings = {
          ...INITIAL_SETTINGS,
          ...parsedSettings,
          musicLibrary: Array.isArray(parsedSettings.musicLibrary) ? parsedSettings.musicLibrary : [],
        };
        delete (sourceSettings as any).defaultAudioTrack;
        fs.writeFileSync(path.join(BACKUP_DIR, `settings_migration_${Date.now()}.json`), raw);
      } catch (e) {
        console.warn('Failed reading existing settings.json', e);
      }
    }

    // Normalize image paths in settings
    sourceSettings.authorImage = (sourceSettings.authorImage || '').replace(/^\/src\/assets\/images\//, '/images/');
    sourceSettings.sidebarImage = (sourceSettings.sidebarImage || '').replace(/^\/src\/assets\/images\//, '/images/');

    this.db.run(
      `INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES ('main', ?, ?)`,
      [JSON.stringify(sourceSettings), new Date().toISOString()]
    );
  }

  // --- STORIES OPERATIONS ---

  private rowToStory(row: any[]): Story {
    const [
      id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
      theme_id, date_display, location,
      cover_image, overlay_quote_en, overlay_quote_th, quote_author,
      category, is_featured, is_published, reading_time_minutes,
      tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
    ] = row;

    let tags: string[] = [];
    try { tags = JSON.parse(tags_json); } catch {}

    let contentBlocks: any[] = [];
    try { contentBlocks = JSON.parse(content_blocks_json); } catch {}

    return {
      id,
      slug,
      title: { en: title_en, th: title_th || '' },
      excerpt: { en: excerpt_en || '', th: excerpt_th || '' },
      type,
      mood,
      themeId: theme_id,
      soundtrack: parseStorySoundtrack(soundtrack_json),
      date: date_display,
      location: location || undefined,
      coverImage: cover_image || undefined,
      overlayQuote: overlay_quote_en || overlay_quote_th ? {
        en: overlay_quote_en || undefined,
        th: overlay_quote_th || undefined,
      } : undefined,
      quoteAuthor: quote_author || undefined,
      category: category || undefined,
      isFeatured: Boolean(is_featured),
      isPublished: Boolean(is_published),
      readingTimeMinutes: Number(reading_time_minutes) || 1,
      tags,
      contentBlocks,
      createdAt: created_at,
      updatedAt: updated_at,
    };
  }

  public getPublishedStories(): Story[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
             theme_id, date_display, location,
             cover_image, overlay_quote_en, overlay_quote_th, quote_author,
             category, is_featured, is_published, reading_time_minutes,
             tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
      FROM stories
      WHERE is_published = 1
      ORDER BY created_at DESC
    `);
    if (!res.length || !res[0].values) return [];
    return res[0].values.map((row) => this.rowToStory(row));
  }

  public getAllStories(): Story[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
             theme_id, date_display, location,
             cover_image, overlay_quote_en, overlay_quote_th, quote_author,
             category, is_featured, is_published, reading_time_minutes,
             tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
      FROM stories
      ORDER BY created_at DESC
    `);
    if (!res.length || !res[0].values) return [];
    return res[0].values.map((row) => this.rowToStory(row));
  }

  public getPublishedStoryBySlug(slugOrId: string): Story | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`
      SELECT id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
             theme_id, date_display, location,
             cover_image, overlay_quote_en, overlay_quote_th, quote_author,
             category, is_featured, is_published, reading_time_minutes,
             tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
      FROM stories
      WHERE (slug = ? OR id = ?) AND is_published = 1
      LIMIT 1
    `);
    stmt.bind([slugOrId, slugOrId]);
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      return this.rowToStory(row);
    }
    stmt.free();
    return null;
  }

  public getAnyStoryById(idOrSlug: string): Story | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`
      SELECT id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
             theme_id, date_display, location,
             cover_image, overlay_quote_en, overlay_quote_th, quote_author,
             category, is_featured, is_published, reading_time_minutes,
             tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
      FROM stories
      WHERE id = ? OR slug = ?
      LIMIT 1
    `);
    stmt.bind([idOrSlug, idOrSlug]);
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      return this.rowToStory(row);
    }
    stmt.free();
    return null;
  }

  public createStory(s: Story): Story {
    if (!this.db) throw new Error('Database not initialized');

    // Ensure slug uniqueness
    let finalSlug = s.slug;
    let counter = 1;
    while (this.getAnyStoryById(finalSlug)) {
      finalSlug = `${s.slug}-${counter++}`;
    }
    s.slug = finalSlug;

    const now = new Date().toISOString();
    s.createdAt = s.createdAt || now;
    s.updatedAt = now;

    this.db.run(
      `INSERT INTO stories (
        id, slug, title_en, title_th, excerpt_en, excerpt_th, type, mood,
        theme_id, date_display, location,
        cover_image, overlay_quote_en, overlay_quote_th, quote_author,
        category, is_featured, is_published, reading_time_minutes,
        tags_json, content_blocks_json, created_at, updated_at, soundtrack_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.slug,
        s.title.en,
        s.title.th || '',
        s.excerpt?.en || '',
        s.excerpt?.th || '',
        s.type,
        s.mood,
        s.themeId,
        s.date,
        s.location || null,
        s.coverImage || null,
        s.overlayQuote?.en || null,
        s.overlayQuote?.th || null,
        s.quoteAuthor || null,
        s.category || 'Journal',
        s.isFeatured ? 1 : 0,
        s.isPublished ? 1 : 0,
        s.readingTimeMinutes || 2,
        JSON.stringify(s.tags || []),
        JSON.stringify(s.contentBlocks || []),
        s.createdAt,
        s.updatedAt,
        s.soundtrack ? JSON.stringify(s.soundtrack) : null,
      ]
    );

    this.saveToDisk();
    return s;
  }

  public updateStory(id: string, s: Partial<Story>): Story {
    if (!this.db) throw new Error('Database not initialized');
    const existing = this.getAnyStoryById(id);
    if (!existing) throw new Error(`Story with id ${id} not found`);

    const merged: Story = {
      ...existing,
      ...s,
      id,
      title: { ...existing.title, ...(s.title || {}) },
      excerpt: { ...existing.excerpt, ...(s.excerpt || {}) },
      updatedAt: new Date().toISOString(),
    };

    this.db.run(
      `UPDATE stories SET
        slug = ?, title_en = ?, title_th = ?, excerpt_en = ?, excerpt_th = ?,
        type = ?, mood = ?, theme_id = ?, soundtrack_json = ?,
        date_display = ?, location = ?, cover_image = ?, overlay_quote_en = ?,
        overlay_quote_th = ?, quote_author = ?, category = ?, is_featured = ?,
        is_published = ?, reading_time_minutes = ?, tags_json = ?,
        content_blocks_json = ?, updated_at = ?
      WHERE id = ?`,
      [
        merged.slug,
        merged.title.en,
        merged.title.th || '',
        merged.excerpt?.en || '',
        merged.excerpt?.th || '',
        merged.type,
        merged.mood,
        merged.themeId,
        merged.soundtrack ? JSON.stringify(merged.soundtrack) : null,
        merged.date,
        merged.location || null,
        merged.coverImage || null,
        merged.overlayQuote?.en || null,
        merged.overlayQuote?.th || null,
        merged.quoteAuthor || null,
        merged.category || 'Journal',
        merged.isFeatured ? 1 : 0,
        merged.isPublished ? 1 : 0,
        merged.readingTimeMinutes || 2,
        JSON.stringify(merged.tags || []),
        JSON.stringify(merged.contentBlocks || []),
        merged.updatedAt,
        id,
      ]
    );

    this.saveToDisk();
    return merged;
  }

  public deleteStory(id: string): boolean {
    if (!this.db) return false;
    this.db.run(`DELETE FROM stories WHERE id = ?`, [id]);
    this.saveToDisk();
    return true;
  }

  // --- SETTINGS OPERATIONS ---

  public getSettings(): SiteSettings {
    if (!this.db) return INITIAL_SETTINGS;
    const stmt = this.db.prepare(`SELECT value_json FROM settings WHERE key = 'main' LIMIT 1`);
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      try {
        const parsed = JSON.parse(row[0] as string);
        delete parsed.defaultAudioTrack;
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          musicLibrary: Array.isArray(parsed.musicLibrary)
            ? parsed.musicLibrary.filter((track: any) => isMusicTrack(track))
            : [],
        };
      } catch {}
    }
    stmt.free();
    return INITIAL_SETTINGS;
  }

  public updateSettings(partial: Partial<SiteSettings>): SiteSettings {
    if (!this.db) throw new Error('Database not initialized');
    const current = this.getSettings();
    const updated = { ...current, ...partial };

    this.db.run(
      `INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES ('main', ?, ?)`,
      [JSON.stringify(updated), new Date().toISOString()]
    );
    this.saveToDisk();
    return updated;
  }

  // --- CONTACT MESSAGES OPERATIONS ---

  public createMessage(msg: {
    id: string;
    name?: string;
    email?: string;
    subject?: string;
    message: string;
    isAnonymous?: boolean;
    deliveryStatus?: string;
    errorLog?: string;
  }): ContactMessage {
    if (!this.db) throw new Error('Database not initialized');
    const createdAt = new Date().toISOString();

    this.db.run(
      `INSERT INTO messages (id, name, email, subject, message, is_anonymous, delivery_status, error_log, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        msg.id,
        msg.name || null,
        msg.email || null,
        msg.subject || null,
        msg.message,
        msg.isAnonymous ? 1 : 0,
        msg.deliveryStatus || 'stored',
        msg.errorLog || null,
        createdAt,
      ]
    );

    this.saveToDisk();

    return {
      id: msg.id,
      name: msg.name || 'Anonymous',
      email: msg.email || '',
      subject: msg.subject || 'A gentle note',
      message: msg.message,
      isAnonymous: Boolean(msg.isAnonymous),
      createdAt,
      read: false,
    };
  }

  public getMessages(): (ContactMessage & { deliveryStatus: string; errorLog?: string })[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT id, name, email, subject, message, is_anonymous, delivery_status, error_log, is_read, created_at
      FROM messages
      ORDER BY created_at DESC
    `);
    if (!res.length || !res[0].values) return [];
    return res[0].values.map((row) => ({
      id: row[0] as string,
      name: (row[1] as string) || 'Anonymous',
      email: (row[2] as string) || '',
      subject: (row[3] as string) || '',
      message: row[4] as string,
      isAnonymous: Boolean(row[5]),
      deliveryStatus: (row[6] as string) || 'stored',
      errorLog: (row[7] as string) || undefined,
      read: Boolean(row[8]),
      createdAt: row[9] as string,
    }));
  }

  public markMessageRead(id: string): boolean {
    if (!this.db) return false;
    this.db.run(`UPDATE messages SET is_read = 1 WHERE id = ?`, [id]);
    this.saveToDisk();
    return true;
  }

  public updateMessageDelivery(id: string, status: string, errorLog?: string): boolean {
    if (!this.db) return false;
    this.db.run(
      `UPDATE messages SET delivery_status = ?, error_log = ? WHERE id = ?`,
      [status, errorLog || null, id]
    );
    this.saveToDisk();
    return true;
  }

  public deleteMessage(id: string): boolean {
    if (!this.db) return false;
    this.db.run(`DELETE FROM messages WHERE id = ?`, [id]);
    this.saveToDisk();
    return true;
  }

  // --- SESSIONS OPERATIONS ---

  public createSession(session: SessionRecord) {
    if (!this.db) return;
    this.db.run(
      `INSERT INTO sessions (token, user_id, ip, user_agent, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [session.token, session.user_id, session.ip, session.user_agent, session.created_at, session.expires_at]
    );
    this.saveToDisk();
  }

  public getSession(token: string): SessionRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`
      SELECT token, user_id, ip, user_agent, created_at, expires_at
      FROM sessions
      WHERE token = ?
      LIMIT 1
    `);
    stmt.bind([token]);
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      return {
        token: row[0] as string,
        user_id: row[1] as string,
        ip: row[2] as string,
        user_agent: row[3] as string,
        created_at: row[4] as string,
        expires_at: row[5] as string,
      };
    }
    stmt.free();
    return null;
  }

  public deleteSession(token: string) {
    if (!this.db) return;
    this.db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
    this.saveToDisk();
  }

  public cleanExpiredSessions() {
    if (!this.db) return;
    const now = new Date().toISOString();
    this.db.run(`DELETE FROM sessions WHERE expires_at < ?`, [now]);
    this.saveToDisk();
  }

  // --- MEDIA OPERATIONS ---

  public saveMedia(media: {
    id: string;
    filename: string;
    url: string;
    mime_type: string;
    size: number;
    alt?: string;
    caption?: string;
  }) {
    if (!this.db) return;
    this.db.run(
      `INSERT INTO media (id, filename, url, mime_type, size, alt, caption, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.filename,
        media.url,
        media.mime_type,
        media.size,
        media.alt || null,
        media.caption || null,
        new Date().toISOString(),
      ]
    );
    this.saveToDisk();
  }

  public getMediaList() {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT id, filename, url, mime_type, size, alt, caption, created_at FROM media ORDER BY created_at DESC`);
    if (!res.length || !res[0].values) return [];
    return res[0].values.map((row) => ({
      id: row[0] as string,
      filename: row[1] as string,
      url: row[2] as string,
      mime_type: row[3] as string,
      size: row[4] as number,
      alt: (row[5] as string) || undefined,
      caption: (row[6] as string) || undefined,
      created_at: row[7] as string,
    }));
  }

  public deleteMediaByUrl(url: string) {
    if (!this.db) return;
    this.db.run(`DELETE FROM media WHERE url = ?`, [url]);
    this.saveToDisk();
  }
}

export const dbManager = new DatabaseManager();
