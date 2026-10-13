import React from 'react';
import { Mail, Music } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { getMusicTrackLabel } from '../services/musicLibrary';
import { MusicArtwork } from './MusicArtwork';

export const AboutView: React.FC<{
  onContactClick: () => void;
}> = ({ onContactClick }) => {
  const { settings, language, t, selectTrack } = useJournal();

  const bio = language === 'th' ? settings.bioTh : settings.bioEn;
  const principles = language === 'th' ? settings.principlesTh : settings.principlesEn;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      {/* Top Banner / Intro */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center mb-16">
        <div className="md:col-span-5">
          <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-square bg-neutral-900 border theme-border">
            <img
              src={settings.authorImage || '/images/pfp.jpg'}
              alt="A quiet corner of Shenzun"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => {
                if (!event.currentTarget.src.endsWith('/images/pfp.jpg')) event.currentTarget.src = '/images/pfp.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-mono drop-shadow-sm">
              <span>Shenzun · Thailand / Bangkok</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          <span className="text-xs font-serif italic theme-text-muted">
            {t.about.role}
          </span>
          <h1 className="font-serif text-3xl md:text-5xl font-normal theme-text-primary tracking-tight mt-2 mb-6">
            {t.about.title}
          </h1>
          <p className="text-sm md:text-base theme-text-secondary leading-relaxed font-light mb-6">
            {bio}
          </p>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={onContactClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full theme-accent-bg text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t.about.contactButton}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Guiding Principles - Clean Editorial Format without Arbitrary Sequential Numbering */}
      <section className="mb-16 p-8 rounded-3xl border theme-surface theme-border">
        <h2 className="font-serif text-2xl font-normal theme-text-primary mb-6">
          {t.about.principlesTitle}
        </h2>
        <ul className="space-y-4">
          {principles.map((item, idx) => (
            <li
              key={idx}
              className="flex items-baseline gap-3 text-sm md:text-base theme-text-secondary font-light leading-relaxed"
            >
              <span className="w-1.5 h-1.5 rounded-full theme-accent shrink-0 mt-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Sounds I Return To */}
      <section className="mb-16">
        <h2 className="font-serif text-2xl font-normal theme-text-primary mb-6 flex items-center gap-2.5">
          <Music className="w-4 h-4 theme-accent" />
          <span>{t.about.favoriteSoundsTitle}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(settings.musicLibrary || []).filter((track) => track.enabled).map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => selectTrack(track)}
              className="group w-full p-3.5 rounded-2xl border theme-surface theme-border hover:theme-border-strong transition-all cursor-pointer flex items-center gap-3 text-left"
            >
              <MusicArtwork artworkUrl={track.artworkUrl} alt={getMusicTrackLabel(track)} className="h-12 w-12 rounded-xl theme-accent" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs theme-text-primary truncate group-hover:theme-accent">
                  {getMusicTrackLabel(track)}
                </div>
                <div className="text-[10px] theme-text-muted truncate">
                  {track.artist || t.music.mp3File}
                </div>
              </div>
              <Music className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            </button>
          ))}
          {(settings.musicLibrary || []).filter((track) => track.enabled).length === 0 && <p className="col-span-full text-sm theme-text-muted">{t.music.noTracks}</p>}
        </div>
      </section>
    </div>
  );
};
