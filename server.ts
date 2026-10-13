import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { dbManager } from './server/db.ts';
import { deliverContactEmail } from './server/email.ts';
import { MusicTrack, Story, StorySoundtrack, SiteSettings } from './src/types/journal.ts';
import { isLocalArtworkUrl, isLocalMp3Url, isMusicTrack, MAX_MUSIC_UPLOAD_BYTES } from './src/services/musicLibrary.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

function normalizeMusicLibrary(value: unknown): { ok: true; value: MusicTrack[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'Music library must be a list of uploaded MP3 files.' };
  const result: MusicTrack[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 200 || ids.has(item.id)) {
      return { ok: false, error: 'Each music library entry needs a unique ID.' };
    }
    if (!isMusicTrack(item) || !isLocalMp3Url(item.url)) return { ok: false, error: 'Only valid uploaded MP3 files can be added to the music library.' };
    const filePath = path.join(UPLOADS_DIR, path.basename(item.url));
    if (!fs.existsSync(filePath)) return { ok: false, error: 'The uploaded MP3 file could not be found. Please upload it again.' };
    if (item.artworkUrl && (!isLocalArtworkUrl(item.artworkUrl) || !fs.existsSync(path.join(UPLOADS_DIR, path.basename(item.artworkUrl))))) {
      return { ok: false, error: 'The uploaded album artwork could not be found. Please upload it again.' };
    }
    result.push({ ...item, title: item.title?.trim() || undefined, artist: item.artist?.trim() || undefined });
    ids.add(item.id);
  }
  return { ok: true, value: result };
}

function normalizeStorySoundtrack(value: unknown, library: MusicTrack[]): { ok: true; value: StorySoundtrack | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (!value || typeof value !== 'object') return { ok: false, error: 'Story soundtrack settings are invalid.' };
  const item = value as Partial<StorySoundtrack>;
  if (typeof item.trackId !== 'string' || typeof item.enabled !== 'boolean' || !['select', 'manual'].includes(item.onEnter || '')) {
    return { ok: false, error: 'Story soundtrack settings are invalid.' };
  }
  if (!library.some((track) => track.id === item.trackId && track.enabled)) return { ok: false, error: 'The selected music track is not available in the music library.' };
  return { ok: true, value: { trackId: item.trackId, enabled: item.enabled, onEnter: item.onEnter! } };
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security headers & Parsers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Base64-encoded 10 MB artwork needs roughly 13.4 MB of JSON payload space.
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

// Rate limiting in-memory store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(prefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
      });
    }

    entry.count++;
    next();
  };
}

// --- SECURE AUTHENTICATION ---
// Check for configured ADMIN_PASSWORD or ADMIN_PASSCODE, defaulting to 'shenzun2025' for initial access.
const effectiveAdminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSCODE || 'shenzun2025';

function verifyPassword(inputPassword: string): boolean {
  if (!effectiveAdminPassword || !inputPassword) return false;
  // Constant time comparison
  const hashA = crypto.createHash('sha256').update(inputPassword).digest();
  const hashB = crypto.createHash('sha256').update(effectiveAdminPassword).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getSessionToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.shenzun_session) {
    return req.cookies.shenzun_session;
  }
  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const session = dbManager.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session invalid or revoked. Please sign in again.' });
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    dbManager.deleteSession(token);
    return res.status(401).json({ error: 'Session has expired. Please sign in again.' });
  }

  (req as any).adminSession = session;
  next();
}

// --- API ROUTES ---

// 1. AUTHENTICATION
app.post('/api/auth/login', rateLimit('login', 6, 15 * 60 * 1000), (req: Request, res: Response) => {
  const { passcode, password } = req.body;
  const input = password || passcode;

  if (!input || !verifyPassword(input)) {
    return res.status(401).json({ error: 'Incorrect administrator password.' });
  }

  // Create cryptographically secure session
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString(); // 24 hours

  dbManager.createSession({
    token,
    user_id: 'admin',
    ip: req.ip || '',
    user_agent: req.headers['user-agent'] || '',
    created_at: now.toISOString(),
    expires_at: expiresAt,
  });

  // Set HTTP-only secure cookie
  res.cookie('shenzun_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 3600 * 1000,
    secure: process.env.NODE_ENV === 'production',
  });

  return res.json({
    success: true,
    token,
    expiresAt,
    user: { name: 'Shenzun Admin' },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) {
    dbManager.deleteSession(token);
  }
  res.clearCookie('shenzun_session');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.json({ authenticated: false });
  }
  const session = dbManager.getSession(token);
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    if (session) dbManager.deleteSession(token);
    res.clearCookie('shenzun_session');
    return res.json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    user: { name: 'Shenzun Admin' },
    expiresAt: session.expires_at,
  });
});

// 2. PUBLIC STORIES (DRAFT ISOLATION GUARANTEED)
// This endpoint ALWAYS returns ONLY published stories. Drafts are NEVER returned here.
app.get('/api/stories', (_req: Request, res: Response) => {
  try {
    const published = dbManager.getPublishedStories();
    return res.json(published);
  } catch (err: any) {
    console.error('Error fetching published stories:', err);
    return res.status(500).json({ error: 'Failed to retrieve published stories.' });
  }
});

// Single story detail: Only published stories are accessible by slug or ID
app.get('/api/stories/:slug', (req: Request, res: Response) => {
  try {
    const story = dbManager.getPublishedStoryBySlug(req.params.slug);
    if (!story) {
      return res.status(404).json({ error: 'Story not found or not published.' });
    }
    return res.json(story);
  } catch (err: any) {
    console.error('Error fetching story:', err);
    return res.status(500).json({ error: 'Failed to retrieve story.' });
  }
});

// 3. ADMIN-ONLY STORIES (Full CMS access)
app.get('/api/admin/stories', requireAdmin, (_req: Request, res: Response) => {
  try {
    const all = dbManager.getAllStories();
    return res.json(all);
  } catch (err: any) {
    console.error('Error fetching admin stories:', err);
    return res.status(500).json({ error: 'Failed to retrieve stories.' });
  }
});

app.get('/api/admin/stories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const story = dbManager.getAnyStoryById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found.' });
    }
    return res.json(story);
  } catch (err: any) {
    console.error('Error fetching admin story detail:', err);
    return res.status(500).json({ error: 'Failed to retrieve story.' });
  }
});

app.post('/api/stories', requireAdmin, (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.title || (!data.title.en && !data.title.th)) {
      return res.status(400).json({ error: 'Story must have a title in English or Thai.' });
    }

    const id = data.id || `story-${Date.now()}`;
    const baseSlug = (data.slug || (data.title.en || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `story-${Date.now()}`;
    const soundtrackResult = normalizeStorySoundtrack(data.soundtrack, dbManager.getSettings().musicLibrary || []);
    if (!soundtrackResult.ok) return res.status(400).json({ error: soundtrackResult.error });

    const newStory: Story = {
      id,
      slug: baseSlug,
      title: { en: data.title.en || '', th: data.title.th || '' },
      excerpt: { en: data.excerpt?.en || '', th: data.excerpt?.th || '' },
      type: data.type || 'photo',
      mood: data.mood || 'peaceful',
      themeId: data.themeId || 'dreamy',
      soundtrack: soundtrackResult.value,
      date: data.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      location: data.location || undefined,
      coverImage: data.coverImage || undefined,
      overlayQuote: data.overlayQuote || undefined,
      quoteAuthor: data.quoteAuthor || undefined,
      category: data.category || 'Journal',
      isFeatured: Boolean(data.isFeatured),
      isPublished: Boolean(data.isPublished), // Defaults to draft unless explicitly published
      readingTimeMinutes: Number(data.readingTimeMinutes) || 1,
      tags: Array.isArray(data.tags) ? data.tags : [],
      contentBlocks: Array.isArray(data.contentBlocks) ? data.contentBlocks : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = dbManager.createStory(newStory);
    return res.status(201).json(saved);
  } catch (err: any) {
    console.error('Error creating story:', err);
    return res.status(500).json({ error: err.message || 'Failed to create story.' });
  }
});

app.put('/api/stories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = dbManager.getAnyStoryById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Story not found.' });
    }

    const changes = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(changes, 'soundtrack')) {
      const soundtrackResult = normalizeStorySoundtrack(changes.soundtrack, dbManager.getSettings().musicLibrary || []);
      if (!soundtrackResult.ok) return res.status(400).json({ error: soundtrackResult.error });
      changes.soundtrack = soundtrackResult.value;
    }
    const updated = dbManager.updateStory(id, changes);
    return res.json(updated);
  } catch (err: any) {
    console.error('Error updating story:', err);
    return res.status(500).json({ error: err.message || 'Failed to update story.' });
  }
});

app.delete('/api/stories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = dbManager.getAnyStoryById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Story not found.' });
    }

    dbManager.deleteStory(id);
    return res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error deleting story:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete story.' });
  }
});

// 4. SETTINGS
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = dbManager.getSettings();
    return res.json(settings);
  } catch (err: any) {
    console.error('Error getting settings:', err);
    return res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

app.put('/api/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const changes = { ...req.body } as Partial<SiteSettings>;
    if (Object.prototype.hasOwnProperty.call(changes, 'musicLibrary')) {
      const libraryResult = normalizeMusicLibrary(changes.musicLibrary);
      if (!libraryResult.ok) return res.status(400).json({ error: libraryResult.error });
      changes.musicLibrary = libraryResult.value;
    }
    const updated = dbManager.updateSettings(changes);
    return res.json(updated);
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ error: err.message || 'Failed to update settings.' });
  }
});

// Admin-only, first-party MP3 uploads. File bytes are stored as static assets; only metadata is kept in SQLite.
app.post('/api/music/upload', requireAdmin, express.raw({ type: 'audio/mpeg', limit: MAX_MUSIC_UPLOAD_BYTES }), (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Choose a valid MP3 file to upload.' });
    }
    if (req.body.length > MAX_MUSIC_UPLOAD_BYTES) {
      return res.status(400).json({ error: 'MP3 files must be 25 MB or smaller.' });
    }
    const startsWithId3 = req.body.length >= 3 && req.body.subarray(0, 3).toString('ascii') === 'ID3';
    const startsWithMpegFrame = req.body.length >= 2 && req.body[0] === 0xff && (req.body[1] & 0xe0) === 0xe0;
    if (!startsWithId3 && !startsWithMpegFrame) {
      return res.status(400).json({ error: 'This file does not look like an MP3. Please choose an .mp3 audio file.' });
    }

    const id = `music_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const suppliedName = typeof req.query.filename === 'string' ? req.query.filename : 'audio.mp3';
    const cleanedName = suppliedName.replace(/[\\/<>:"|?*\x00-\x1f]/g, '_').trim();
    if (!cleanedName.toLowerCase().endsWith('.mp3')) return res.status(400).json({ error: 'Choose a file with the .mp3 extension.' });
    const filename = cleanedName.slice(0, 255) || 'audio.mp3';
    const track: MusicTrack = {
      id,
      provider: 'mp3',
      url: `/uploads/${id}.mp3`,
      filename,
      mimeType: 'audio/mpeg',
      size: req.body.length,
      enabled: true,
    };
    fs.writeFileSync(path.join(UPLOADS_DIR, `${id}.mp3`), req.body, { flag: 'wx' });
    return res.status(201).json(track);
  } catch (err: any) {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'MP3 files must be 25 MB or smaller.' });
    console.error('Music upload failed:', err);
    return res.status(500).json({ error: 'MP3 upload failed. Please try again.' });
  }
}, (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'MP3 files must be 25 MB or smaller.' });
  return next(err);
});

app.delete('/api/music/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!/^music_\d+_[a-f0-9]{8}$/.test(id)) return res.status(400).json({ error: 'Invalid music file ID.' });

    const settings = dbManager.getSettings();
    const musicLibrary = settings.musicLibrary || [];
    const existsInLibrary = musicLibrary.some((track) => track.id === id);
    const stories = dbManager.getAllStories().filter((story) => story.soundtrack?.trackId === id);
    for (const story of stories) dbManager.updateStory(story.id, { soundtrack: null });
    if (existsInLibrary) dbManager.updateSettings({ musicLibrary: musicLibrary.filter((track) => track.id !== id) });

    const filePath = path.join(UPLOADS_DIR, `${id}.mp3`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.json({ success: true, id, clearedStoryAssociations: stories.length });
  } catch (err: any) {
    console.error('MP3 removal failed:', err);
    return res.status(500).json({ error: 'Could not remove this MP3. Please try again.' });
  }
});

// 5. CONTACT MESSAGES & EMAIL DELIVERY
app.post('/api/messages', rateLimit('message', 5, 10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, isAnonymous } = req.body;

    // Strict validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message body is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 2,000 characters.' });
    }
    if (email && (typeof email !== 'string' || !email.includes('@') || email.length > 120)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (name && name.length > 80) {
      return res.status(400).json({ error: 'Name must not exceed 80 characters.' });
    }
    if (subject && subject.length > 150) {
      return res.status(400).json({ error: 'Subject must not exceed 150 characters.' });
    }

    const id = `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanName = isAnonymous ? 'Anonymous' : (name?.trim() || 'A Reader');
    const cleanEmail = isAnonymous ? '' : (email?.trim() || '');
    const cleanSubject = subject?.trim() || 'A gentle note';
    const cleanMessage = message.trim();

    // Outbound email delivery attempt
    const deliveryResult = await deliverContactEmail({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      isAnonymous: Boolean(isAnonymous),
    });

    // Save in SQLite database with truthful status
    const saved = dbManager.createMessage({
      id,
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      isAnonymous: Boolean(isAnonymous),
      deliveryStatus: deliveryResult.status,
      errorLog: deliveryResult.errorLog,
    });

    return res.status(201).json({
      success: true,
      id: saved.id,
      deliveryStatus: deliveryResult.status,
      message: deliveryResult.message,
    });
  } catch (err: any) {
    console.error('Error handling contact message:', err);
    return res.status(500).json({ error: 'Failed to process message.' });
  }
});

app.get('/api/messages', requireAdmin, (_req: Request, res: Response) => {
  try {
    const list = dbManager.getMessages();
    return res.json(list);
  } catch (err: any) {
    console.error('Error reading messages:', err);
    return res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

app.put('/api/messages/:id/read', requireAdmin, (req: Request, res: Response) => {
  try {
    dbManager.markMessageRead(req.params.id);
    return res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error('Error marking message read:', err);
    return res.status(500).json({ error: 'Failed to update message.' });
  }
});

app.delete('/api/messages/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    dbManager.deleteMessage(req.params.id);
    return res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error('Error deleting message:', err);
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
});

app.post('/api/messages/:id/retry', requireAdmin, async (req: Request, res: Response) => {
  try {
    const messages = dbManager.getMessages();
    const msg = messages.find((m) => m.id === req.params.id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    const deliveryResult = await deliverContactEmail({
      name: msg.name,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      isAnonymous: msg.isAnonymous,
    });

    dbManager.updateMessageDelivery(msg.id, deliveryResult.status, deliveryResult.errorLog);
    return res.json({
      success: deliveryResult.status === 'sent',
      deliveryStatus: deliveryResult.status,
      message: deliveryResult.message,
    });
  } catch (err: any) {
    console.error('Error retrying message delivery:', err);
    return res.status(500).json({ error: 'Retry failed.' });
  }
});

// 6. MEDIA ASSET UPLOAD
app.post('/api/media/upload', requireAdmin, (req: Request, res: Response) => {
  try {
    const { filename, base64Data, mimeType, alt, caption } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'base64Data and mimeType are required.' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: `Unsupported media type: ${mimeType}` });
    }

    const cleanBase64 = base64Data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit (10MB).' });
    }

    const ext = mimeType.replace('image/', '');
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    const fileId = `media_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const safeFilename = `${fileId}.${cleanExt}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${safeFilename}`;

    dbManager.saveMedia({
      id: fileId,
      filename: filename || safeFilename,
      url: publicUrl,
      mime_type: mimeType,
      size: buffer.length,
      alt,
      caption,
    });

    return res.status(201).json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error('Upload failed:', err);
    return res.status(500).json({ error: 'Media upload failed.' });
  }
});

app.delete('/api/music-artwork', requireAdmin, (req: Request, res: Response) => {
  try {
    const url = req.body?.url;
    if (!isLocalArtworkUrl(url)) return res.status(400).json({ error: 'Invalid album artwork URL.' });

    const settings = dbManager.getSettings();
    if ((settings.musicLibrary || []).some((track) => track.artworkUrl === url)) {
      return res.status(409).json({ error: 'This artwork is still used by a music track.' });
    }
    const { musicLibrary: _musicLibrary, ...otherSettings } = settings;
    if (JSON.stringify(otherSettings).includes(url) || dbManager.getAllStories().some((story) => JSON.stringify(story).includes(url))) {
      return res.status(409).json({ error: 'This image is still used by saved content.' });
    }

    const filePath = path.join(UPLOADS_DIR, path.basename(url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    dbManager.deleteMediaByUrl(url);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Album artwork cleanup failed:', err);
    return res.status(500).json({ error: 'Could not remove unused album artwork.' });
  }
});

app.get('/api/media', requireAdmin, (_req: Request, res: Response) => {
  try {
    const list = dbManager.getMediaList();
    return res.json(list);
  } catch (err: any) {
    console.error('Failed reading media list:', err);
    return res.status(500).json({ error: 'Failed to read media library.' });
  }
});

// START SERVER & VITE INTEGRATION
async function startServer() {
  await dbManager.init();

  // Periodic cleanup of expired sessions
  setInterval(() => {
    try {
      dbManager.cleanExpiredSessions();
    } catch {}
  }, 3600 * 1000);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SHENZUN] Server online at http://0.0.0.0:${PORT} (Node env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
