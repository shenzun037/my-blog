import type { MusicTrack } from '../types/journal';

export const MAX_MUSIC_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_MUSIC_ARTWORK_UPLOAD_BYTES = 10 * 1024 * 1024;

const MUSIC_ID_PATTERN = /^music_\d+_[a-f0-9]{8}$/;
const MUSIC_URL_PATTERN = /^\/uploads\/(music_\d+_[a-f0-9]{8})\.mp3$/;
const ARTWORK_URL_PATTERN = /^\/uploads\/media_\d+_[a-f0-9]{8}\.(?:jpg|png|webp|gif)$/;

export function isLocalMp3Url(value: unknown): value is string {
  return typeof value === 'string' && MUSIC_URL_PATTERN.test(value);
}

export function isLocalArtworkUrl(value: unknown): value is string {
  return typeof value === 'string' && ARTWORK_URL_PATTERN.test(value);
}

export function getMusicTitleFromFilename(filename: string): string {
  return filename
    .trim()
    .replace(/\.mp3$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isMusicTrack(value: unknown): value is MusicTrack {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<MusicTrack>;
  const match = typeof track.url === 'string' ? MUSIC_URL_PATTERN.exec(track.url) : null;
  return Boolean(
    track.provider === 'mp3' &&
    typeof track.id === 'string' && MUSIC_ID_PATTERN.test(track.id) &&
    match?.[1] === track.id &&
    track.mimeType === 'audio/mpeg' &&
    typeof track.filename === 'string' && track.filename.length > 0 && track.filename.length <= 255 &&
    typeof track.size === 'number' && Number.isInteger(track.size) && track.size > 0 && track.size <= MAX_MUSIC_UPLOAD_BYTES &&
    typeof track.enabled === 'boolean' &&
    (track.title === undefined || (typeof track.title === 'string' && track.title.length <= 200)) &&
    (track.artist === undefined || (typeof track.artist === 'string' && track.artist.length <= 200)) &&
    (track.artworkUrl === undefined || isLocalArtworkUrl(track.artworkUrl))
  );
}

export function getMusicTrackLabel(track: MusicTrack): string {
  return track.title?.trim() || getMusicTitleFromFilename(track.filename) || track.filename;
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
