import assert from 'node:assert/strict';
import test from 'node:test';
import type { MusicTrack, Story } from '../src/types/journal.ts';
import { formatAudioTime, getMusicTitleFromFilename, isLocalArtworkUrl, isLocalMp3Url, isMusicTrack, MAX_MUSIC_ARTWORK_UPLOAD_BYTES, MAX_MUSIC_UPLOAD_BYTES } from '../src/services/musicLibrary.ts';
import { resolveStoryMusicSelection } from '../src/services/storyMusicPolicy.ts';

const sampleTrack = (id = 'music_123_abcdef12'): MusicTrack => ({
  id,
  provider: 'mp3',
  url: `/uploads/${id}.mp3`,
  filename: 'quiet-morning.mp3',
  mimeType: 'audio/mpeg',
  size: 1024,
  title: 'Quiet Morning',
  enabled: true,
});

const sampleStory = (trackId?: string): Story => ({
  id: 'story-1', slug: 'story-1', title: { en: 'Story', th: 'เรื่อง' }, excerpt: { en: '', th: '' },
  type: 'diary', contentBlocks: [], mood: 'peaceful', themeId: 'dreamy',
  soundtrack: trackId ? { trackId, enabled: true, onEnter: 'select' } : null,
  date: 'Today', tags: [], isPublished: true, readingTimeMinutes: 1, createdAt: '', updatedAt: '',
});

test('accepts only canonical first-party MP3 upload paths', () => {
  const valid = '/uploads/music_123_abcdef12.mp3';
  assert.equal(isLocalMp3Url(valid), true);
  for (const value of [
    'https://open.spotify.com/track/0123456789ABCDEFGHIJKL',
    'https://youtube.com/watch?v=abcdefghijk',
    '/uploads/song.mp3',
    '/uploads/../music_123_abcdef12.mp3',
    '/uploads/music_123_ABCDEF12.mp3',
    '/uploads/music_123_abcdef12.wav',
  ]) assert.equal(isLocalMp3Url(value), false, value);
});

test('validates MP3 metadata without inventing duration or playback values', () => {
  assert.equal(MAX_MUSIC_UPLOAD_BYTES, 1 * 1024 * 1024 * 1024);
  assert.equal(MAX_MUSIC_ARTWORK_UPLOAD_BYTES, 50 * 1024 * 1024);
  const track = sampleTrack();
  assert.equal(isMusicTrack(track), true);
  assert.equal('duration' in track, false);
  assert.equal('currentTime' in track, false);
  assert.equal(isMusicTrack({ ...track, url: 'https://example.com/song.mp3' }), false);
  assert.equal(isMusicTrack({ ...track, size: MAX_MUSIC_UPLOAD_BYTES + 1 }), false);
  assert.equal(formatAudioTime(125.9), '2:05');
  assert.equal(formatAudioTime(Number.NaN), '0:00');
});

test('derives a readable default title from the uploaded filename', () => {
  assert.equal(getMusicTitleFromFilename('quiet_morning-song.MP3'), 'quiet morning song');
  assert.equal(getMusicTitleFromFilename('  --.mp3  '), '');
});

test('accepts only canonical uploaded album artwork paths', () => {
  const artworkUrl = '/uploads/media_123_abcdef12.webp';
  assert.equal(isLocalArtworkUrl(artworkUrl), true);
  assert.equal(isMusicTrack({ ...sampleTrack(), artworkUrl }), true);
  for (const value of [
    'https://example.com/cover.webp',
    '/uploads/media_123_abcdef12.svg',
    '/uploads/../media_123_abcdef12.webp',
    '/images/cover.webp',
  ]) assert.equal(isLocalArtworkUrl(value), false, value);
  assert.equal(isMusicTrack({ ...sampleTrack(), artworkUrl: 'https://example.com/cover.webp' }), false);
});

test('Follow Story selects the associated MP3 without starting playback', () => {
  const track = sampleTrack();
  const selection = resolveStoryMusicSelection('follow', null, sampleStory(track.id), [track]);
  assert.equal(selection.track?.id, track.id);
  assert.equal(selection.shouldReplace, true);
});

test('Follow Story clears selection for a story without a soundtrack', () => {
  const selection = resolveStoryMusicSelection('follow', sampleTrack(), sampleStory(), [sampleTrack()]);
  assert.equal(selection.track, null);
  assert.equal(selection.shouldReplace, true);
});

test('Lock Current Audio and Off preserve selection against story navigation', () => {
  const current = sampleTrack('music_124_abcdef12');
  for (const mode of ['lock', 'off'] as const) {
    const selection = resolveStoryMusicSelection(mode, current, sampleStory('music_123_abcdef12'), [sampleTrack()]);
    assert.equal(selection.track, current);
    assert.equal(selection.shouldReplace, false);
  }
});

test('manual-on-entry stories and missing library references do not silently change selection', () => {
  const current = sampleTrack('music_124_abcdef12');
  const manual = { ...sampleStory('music_123_abcdef12'), soundtrack: { trackId: 'music_123_abcdef12', enabled: true, onEnter: 'manual' as const } };
  assert.equal(resolveStoryMusicSelection('follow', current, manual, [sampleTrack()]).shouldReplace, false);
  const missing = resolveStoryMusicSelection('follow', current, sampleStory('missing'), [sampleTrack()]);
  assert.equal(missing.track, null);
  assert.equal(missing.shouldReplace, true);
});
