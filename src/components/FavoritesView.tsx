import React from 'react';
import { Heart, Compass, ArrowRight } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { StoryCard } from './StoryCard';
import { EditorialMosaic } from './EditorialMosaic';
import { Story } from '../types/journal';

export const FavoritesView: React.FC<{
  onSelectStory: (story: Story) => void;
  onExplore: () => void;
}> = ({ onSelectStory, onExplore }) => {
  const { stories, favorites, t } = useJournal();

  const favoriteStories = stories.filter((s) => favorites.includes(s.id));

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-12 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center p-3 rounded-full theme-surface-raised mb-4 border theme-border">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-normal theme-text-primary tracking-tight mb-3">
          {t.favorites.title}
        </h1>
        <p className="text-xs md:text-sm theme-text-secondary font-light leading-relaxed">
          {t.favorites.subtitle}
        </p>
      </header>

      {favoriteStories.length === 0 ? (
        <div className="text-center py-20 px-6 max-w-md mx-auto rounded-3xl border theme-surface theme-border">
          <Compass className="w-8 h-8 mx-auto theme-text-muted mb-4" />
          <h3 className="font-serif text-lg font-medium theme-text-primary mb-2">
            {t.favorites.emptyTitle}
          </h3>
          <p className="text-xs theme-text-muted leading-relaxed font-light mb-6">
            {t.favorites.emptyDesc}
          </p>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full theme-accent-bg text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <span>{t.favorites.exploreButton}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <EditorialMosaic
          stories={favoriteStories}
          onSelectStory={onSelectStory}
        />
      )}
    </div>
  );
};
