import type { MusicTrack, Story } from '../types/journal';
import type { AudioMode } from '../context/JournalContext';

export interface StoryMusicSelection {
  track: MusicTrack | null;
  shouldReplace: boolean;
}

/** Resolve story navigation without starting playback or overriding a locked/off preference. */
export function resolveStoryMusicSelection(
  mode: AudioMode,
  currentTrack: MusicTrack | null,
  story: Story | null | undefined,
  library: MusicTrack[],
): StoryMusicSelection {
  if (mode !== 'follow') return { track: currentTrack, shouldReplace: false };
  const association = story?.soundtrack;
  if (association?.enabled && association.onEnter === 'manual') return { track: currentTrack, shouldReplace: false };
  const track = association?.enabled
    ? library.find((item) => item.id === association.trackId && item.enabled) || null
    : null;
  return { track, shouldReplace: true };
}
