import React, { useEffect } from 'react';
import { useJournal } from '../context/JournalContext';

/** A single first-party audio element coordinates playback across both responsive docks. */
export const MusicPlaybackEngine: React.FC = () => {
  const {
    currentTrack, audioMode, audioRef, audioVolume,
    handleAudioPlay, handleAudioPause, handleAudioTimeUpdate, handleAudioMetadata, handleAudioError,
  } = useJournal();

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = audioVolume;
  }, [audioRef, audioVolume]);

  return (
    <audio
      ref={audioRef}
      src={audioMode === 'off' ? undefined : currentTrack?.url}
      preload="metadata"
      className="sr-only"
      onPlay={() => {
        if (audioMode === 'off') audioRef.current?.pause();
        else handleAudioPlay();
      }}
      onPause={handleAudioPause}
      onTimeUpdate={handleAudioTimeUpdate}
      onLoadedMetadata={handleAudioMetadata}
      onDurationChange={handleAudioMetadata}
      onEnded={handleAudioPause}
      onError={handleAudioError}
      aria-label={currentTrack?.title || currentTrack?.filename || 'MP3 player'}
    />
  );
};
