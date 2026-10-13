import React, { useMemo, useState } from 'react';
import { Heart, Library, Pause, Play, Search, X } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import type { MusicTrack } from '../types/journal';
import { formatAudioTime, getMusicTrackLabel } from '../services/musicLibrary';
import { MusicArtwork } from './MusicArtwork';

export const AudioPlayerDock: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    currentTrack, audioMode, setAudioMode, selectTrack, t,
    isAudioPlaying, audioCurrentTime, audioDuration, audioVolume, audioError,
    toggleAudioPlayback, seekAudio, setAudioVolume,
    settings, isAudioFavorite, toggleAudioBookmark,
  } = useJournal();
  const [showLibrary, setShowLibrary] = useState(false);
  const [search, setSearch] = useState('');
  const tracks = settings.musicLibrary || [];
  const matchingTracks = useMemo(() => tracks.filter((track) => track.enabled &&
    `${track.title || ''} ${track.artist || ''} ${track.filename}`.toLowerCase().includes(search.trim().toLowerCase())), [tracks, search]);
  const modeLabel = (mode: 'follow' | 'lock' | 'off') => mode === 'follow' ? t.music.followStory : mode === 'lock' ? t.music.lockCurrent : t.music.off;
  const trackLabel = currentTrack ? getMusicTrackLabel(currentTrack) : t.music.chooseTrack;
  const seekValue = audioDuration > 0 ? Math.min(audioCurrentTime, audioDuration) : 0;

  const chooseTrack = (track: MusicTrack) => {
    selectTrack(track);
    setShowLibrary(false);
  };

  return (
    <div className="relative min-w-0 w-full text-white">
      {showLibrary && (
        <section className={`absolute bottom-full left-0 right-0 z-50 mb-3 box-border w-full max-w-full overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/95 p-3.5 shadow-2xl backdrop-blur-xl ${compact ? 'max-h-[70dvh]' : 'max-h-[65dvh]'}`} aria-label={t.music.library}>
          <header className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide text-white/80"><Library className="h-4 w-4 shrink-0 text-amber-200" /><span className="truncate">{t.music.library}</span></div>
            <button type="button" onClick={() => setShowLibrary(false)} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label={t.music.closeLibrary}><X className="h-4 w-4" /></button>
          </header>

          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label={t.header.audioModeFollow}>
            {(['follow', 'lock', 'off'] as const).map((mode) => (
              <button type="button" key={mode} onClick={() => setAudioMode(mode)} aria-pressed={audioMode === mode}
                className={`min-h-10 min-w-0 whitespace-normal break-words rounded-lg px-1 text-center text-[10px] leading-tight font-medium transition-colors ${audioMode === mode ? mode === 'off' ? 'bg-rose-400/20 text-rose-100' : 'bg-white/15 text-white' : 'text-white/50 hover:text-white/85'}`}>
                {modeLabel(mode)}
              </button>
            ))}
          </div>
          {audioMode === 'lock' && <button type="button" onClick={() => setAudioMode('follow')} className="mb-3 min-h-9 w-full rounded-lg border border-white/10 text-[10px] text-white/65 hover:bg-white/5">{t.music.returnFollow}</button>}

          <label className="relative mb-3 block">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/35" />
            <input type="search" aria-label={t.music.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.music.search} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-amber-200/50" />
          </label>

          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {matchingTracks.length === 0 ? <p className="px-2 py-4 text-center text-[11px] leading-relaxed text-white/45">{tracks.length ? t.music.noResults : t.music.noTracks}</p> : matchingTracks.map((track) => (
              <div key={track.id} className={`flex items-center gap-2 rounded-xl p-2 ${currentTrack?.id === track.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <MusicArtwork artworkUrl={track.artworkUrl} alt={getMusicTrackLabel(track)} className="h-10 w-10 rounded-lg" />
                <button type="button" onClick={() => chooseTrack(track)} className="min-h-10 min-w-0 flex-1 text-left" aria-current={currentTrack?.id === track.id ? 'true' : undefined}>
                  <span className="block truncate text-[11px] font-medium text-white/90">{getMusicTrackLabel(track)}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/45">{track.artist || t.music.mp3File}</span>
                </button>
                <button type="button" onClick={() => toggleAudioBookmark(track.id)} className={`rounded-full p-2 ${isAudioFavorite(track.id) ? 'text-rose-300' : 'text-white/35 hover:text-white/75'}`} aria-pressed={isAudioFavorite(track.id)} aria-label={`${isAudioFavorite(track.id) ? t.music.unsaveTrack : t.music.saveTrack}: ${getMusicTrackLabel(track)}`}>
                  <Heart className={`h-3.5 w-3.5 ${isAudioFavorite(track.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`rounded-2xl border border-white/10 bg-neutral-950/90 text-white shadow-xl backdrop-blur-xl ${compact ? 'p-2.5' : 'p-3'}`} aria-label={t.music.library}>
        <div className="flex min-w-0 items-center gap-3">
          <MusicArtwork artworkUrl={currentTrack?.artworkUrl} alt={trackLabel} className="h-10 w-10 shrink-0 rounded-xl bg-white/8 text-amber-200" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-white/40">{currentTrack ? t.music.mp3File : t.player.nowPlaying}</p>
            <p className="truncate text-xs font-medium text-white/90">{trackLabel}</p>
            <p className="truncate text-[10px] text-white/45">{currentTrack?.artist || modeLabel(audioMode)}</p>
          </div>
          {currentTrack && audioMode !== 'off' && (
            <button type="button" onClick={() => void toggleAudioPlayback()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 hover:bg-amber-100" aria-label={isAudioPlaying ? t.music.pause : t.music.play}>
              {isAudioPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
          )}
          <button type="button" onClick={() => setShowLibrary((value) => !value)} className={`min-h-10 shrink-0 rounded-full p-2 transition-colors ${showLibrary ? 'bg-white/15 text-amber-100' : 'text-white/60 hover:bg-white/10 hover:text-white'}`} aria-expanded={showLibrary} aria-label={t.player.switchSoundtrack}>
            <Library className="h-4 w-4" />
          </button>
        </div>

        {currentTrack && audioMode !== 'off' && (
          <div className="mt-2 border-t border-white/5 pt-2">
            <div className="flex items-center gap-2 text-[9px] tabular-nums text-white/45">
              <span>{formatAudioTime(audioCurrentTime)}</span>
              <input type="range" min={0} max={audioDuration || 0} step={0.1} value={seekValue} disabled={!audioDuration} onChange={(event) => seekAudio(Number(event.target.value))} aria-label={t.music.seek} className="h-1 min-w-0 flex-1 accent-amber-200 disabled:opacity-40" />
              <span>{audioDuration ? formatAudioTime(audioDuration) : '--:--'}</span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[9px] text-white/45">{t.music.volume}<input type="range" min={0} max={1} step={0.01} value={audioVolume} onChange={(event) => setAudioVolume(Number(event.target.value))} aria-label={t.music.volume} className={`h-1 accent-amber-200 ${compact ? 'min-w-0 flex-1' : 'w-24'}`} /></label>
            {audioError && <p role="alert" className="mt-1 text-[10px] text-rose-200">{t.music.playbackError}</p>}
          </div>
        )}

        <div className="mt-2 grid grid-cols-3 items-stretch gap-1 border-t border-white/5 pt-2" role="group" aria-label={t.header.audioModeFollow}>
          {(['follow', 'lock', 'off'] as const).map((mode) => (
            <button type="button" key={mode} onClick={() => setAudioMode(mode)} aria-pressed={audioMode === mode}
              className={`min-h-9 min-w-0 whitespace-normal break-words rounded-md px-1 py-1 text-center text-[9px] leading-tight transition-colors ${audioMode === mode ? mode === 'off' ? 'bg-rose-400/20 text-rose-100' : 'bg-white/15 text-white' : 'text-white/40 hover:text-white/80'}`}>
              {modeLabel(mode)}
            </button>
          ))}
          {audioMode === 'lock' && <button type="button" onClick={() => setAudioMode('follow')} className="col-span-3 py-1 text-center text-[9px] text-amber-100/80 underline underline-offset-2">{t.music.returnFollow}</button>}
        </div>
      </section>
    </div>
  );
};
