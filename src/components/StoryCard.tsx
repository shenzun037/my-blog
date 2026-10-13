import React from 'react';
import { Heart, MapPin, Volume2 } from 'lucide-react';
import { Story } from '../types/journal';
import { useJournal } from '../context/JournalContext';

export type StoryCardVariant =
  | 'standard'
  | 'featured'
  | 'wide'
  | 'portrait'
  | 'quote'
  | 'compact';

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  className?: string;
  variant?: StoryCardVariant;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelectStory,
  className = '',
  variant = 'standard',
}) => {
  const { language, isFavorite, toggleBookmark, t } = useJournal();
  const bookmarked = isFavorite(story.id);

  const title = language === 'th' ? (story.title.th || story.title.en) : story.title.en;
  const excerpt = language === 'th' ? (story.excerpt.th || story.excerpt.en) : story.excerpt.en;
  const overlayQuote = story.overlayQuote
    ? (language === 'th' ? (story.overlayQuote.th || story.overlayQuote.en) : story.overlayQuote.en)
    : null;

  // Determine effective variant: quote stories always render with dedicated quote typography
  const effectiveVariant = story.type === 'quote' ? 'quote' : variant;

  // -------------------------------------------------------------
  // 1. QUOTE-ONLY CARD (Atmospheric typography)
  // -------------------------------------------------------------
  if (effectiveVariant === 'quote') {
    const isProminentQuote = variant === 'featured' || variant === 'wide';
    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl border flex flex-col justify-between theme-surface theme-border h-full ${
          isProminentQuote ? 'p-8 md:p-10' : variant === 'compact' ? 'p-5' : 'p-6 md:p-7'
        } ${className}`}
      >
        <div className="flex items-start justify-between mb-4">
          <span
            className={`font-serif leading-none select-none theme-text-muted opacity-50 ${
              isProminentQuote ? 'text-4xl md:text-5xl' : 'text-3xl'
            }`}
            aria-hidden="true"
          >
            “
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="theme-text-muted hover:text-rose-500 transition-colors p-1.5 rounded-full hover:bg-rose-500/10 cursor-pointer"
            aria-label="Save quote"
          >
            <Heart
              className={`w-4 h-4 ${
                bookmarked ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
        </div>

        <div className="my-auto py-2">
          <blockquote
            className={`font-serif leading-relaxed theme-text-primary whitespace-pre-line tracking-wide ${
              isProminentQuote
                ? 'text-xl md:text-2xl lg:text-3xl font-light'
                : variant === 'compact'
                ? 'text-sm md:text-base font-normal'
                : 'text-base md:text-lg font-normal'
            }`}
          >
            {overlayQuote || excerpt || title}
          </blockquote>
          {story.quoteAuthor && (
            <p className="mt-3 text-xs theme-text-secondary font-mono tracking-wider italic">
              — {story.quoteAuthor}
            </p>
          )}
        </div>

        <div
          className="mt-6 pt-3 border-t flex items-center justify-between text-xs theme-text-muted"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">{story.date}</span>
            {story.tags?.[0] && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5">
                #{story.tags[0]}
              </span>
            )}
          </div>
          {story.location && (
            <span className="flex items-center gap-1 text-[11px]">
              <MapPin className="w-3 h-3" />
              {story.location}
            </span>
          )}
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // 2. NOTE / LIST CARD
  // -------------------------------------------------------------
  if (story.type === 'note') {
    const listBlock = story.contentBlocks.find((b) => b.type === 'noteList');
    const items = listBlock
      ? (language === 'th' ? (listBlock.itemsTh || listBlock.itemsEn) : listBlock.itemsEn)
      : null;

    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl border flex flex-col justify-between theme-surface theme-border h-full ${
          variant === 'compact' ? 'p-5' : 'p-6 md:p-7'
        } ${className}`}
      >
        <div className="flex items-center justify-between mb-3 text-xs theme-text-muted">
          <span className="font-mono text-[11px]">{story.date}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="theme-text-muted hover:text-rose-500 transition-colors p-1.5 rounded-full hover:bg-rose-500/10 cursor-pointer"
            aria-label="Save note"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                bookmarked ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex-1 my-1">
          <h3 className="font-serif text-base md:text-lg font-medium theme-text-primary mb-3 group-hover:theme-accent transition-colors">
            {title}
          </h3>

          {items && items.length > 0 ? (
            <ul className="space-y-1.5 text-xs theme-text-secondary leading-relaxed">
              {items.slice(0, variant === 'compact' ? 3 : 5).map((item, idx) => (
                <li key={idx} className="tracking-wide flex items-start gap-1.5">
                  <span className="theme-accent font-mono text-[10px] mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs theme-text-secondary leading-relaxed line-clamp-3">
              {excerpt}
            </p>
          )}
        </div>

        <div
          className="mt-4 pt-3 flex items-center justify-between theme-text-muted text-xs border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-[11px] font-mono">
            {story.location || 'Note'}
          </span>
          {story.soundtrack?.enabled && (
            <Volume2 className="w-3.5 h-3.5 theme-accent" />
          )}
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // 3. WIDE HORIZONTAL EDITORIAL CARD
  // -------------------------------------------------------------
  if (effectiveVariant === 'wide' && story.coverImage) {
    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border theme-surface theme-border flex flex-col sm:flex-row h-full ${className}`}
      >
        {/* Left Side: Image */}
        <div className="relative sm:w-5/12 sm:min-w-[200px] aspect-[16/10] sm:aspect-auto overflow-hidden bg-neutral-900 shrink-0">
          <img
            src={story.coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden pointer-events-none" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-400 transition-colors sm:hidden cursor-pointer"
            aria-label="Save story"
          >
            <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-400 text-rose-400' : ''}`} />
          </button>
        </div>

        {/* Right Side: Editorial Content */}
        <div className="sm:w-7/12 p-6 md:p-7 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
              <span className="font-mono text-[11px]">{story.date}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                  {story.category || 'Journal'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(story.id);
                  }}
                  className="hidden sm:inline-flex p-1 rounded-full theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                  aria-label="Save story"
                >
                  <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            <h3 className="font-serif text-xl md:text-2xl font-medium theme-text-primary group-hover:theme-accent transition-colors leading-snug">
              {title}
            </h3>

            {excerpt && (
              <p className="mt-2.5 text-xs md:text-sm theme-text-secondary leading-relaxed line-clamp-3">
                {excerpt}
              </p>
            )}
          </div>

          <div
            className="mt-5 pt-3 border-t flex items-center justify-between text-xs theme-text-muted"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono">{story.readingTimeMinutes} min read</span>
              {story.location && (
                <span className="flex items-center gap-1 text-[11px]">
                  <MapPin className="w-3 h-3" />
                  {story.location}
                </span>
              )}
            </div>
            {story.soundtrack?.enabled && (
              <span className="flex items-center gap-1 text-[11px] theme-accent">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono text-[10px]">{t.story.soundtrack}</span>
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // 4. FEATURED LEAD EDITORIAL CARD
  // -------------------------------------------------------------
  if (effectiveVariant === 'featured' && story.coverImage) {
    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl border theme-surface theme-border flex flex-col justify-between h-full ${className}`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
          <img
            src={story.coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

          {/* Overlaid Quote if any */}
          {overlayQuote && (
            <div className="absolute top-6 left-6 right-6 text-white pointer-events-none">
              <p
                className="font-handwritten text-2xl md:text-3xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line tracking-wide"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
              >
                {overlayQuote}
              </p>
            </div>
          )}

          {/* Bottom metadata over photo */}
          <div className="absolute bottom-3.5 left-5 right-5 flex items-center justify-between text-white text-[11px] font-mono pointer-events-none drop-shadow-sm">
            <span>{story.date}</span>
            {story.location && (
              <span className="flex items-center gap-1 text-white">
                <MapPin className="w-3 h-3" />
                {story.location}
              </span>
            )}
          </div>

          {/* Bookmark */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-400 transition-colors cursor-pointer"
            aria-label="Save story"
          >
            <Heart
              className={`w-4 h-4 ${
                bookmarked ? 'fill-rose-400 text-rose-400' : ''
              }`}
            />
          </button>
        </div>

        {/* Editorial Text Details */}
        <div className="p-6 md:p-7 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
              <span className="text-[10px] font-mono tracking-widest uppercase font-semibold theme-accent">
                ★ Featured Story
              </span>
              <span className="text-[10px] font-mono tracking-wider">
                {story.category || 'Reflections'}
              </span>
            </div>

            <h3 className="font-serif text-2xl md:text-3xl font-medium theme-text-primary group-hover:theme-accent transition-colors leading-tight">
              {title}
            </h3>

            {excerpt && (
              <p className="mt-3 text-xs md:text-sm theme-text-secondary leading-relaxed line-clamp-3">
                {excerpt}
              </p>
            )}
          </div>

          <div
            className="mt-6 pt-3.5 border-t flex items-center justify-between text-xs theme-text-muted"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-[11px] font-mono">{story.readingTimeMinutes} min read</span>
            {story.soundtrack?.enabled && (
              <span className="flex items-center gap-1.5 text-[11px] theme-accent font-medium">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t.story.soundtrack}</span>
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // 5. COMPACT CARD (Supporting stacks or denser rows)
  // -------------------------------------------------------------
  if (effectiveVariant === 'compact') {
    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border theme-surface theme-border flex flex-col justify-between h-full ${className}`}
      >
        {story.coverImage && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
            <img
              src={story.coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono pointer-events-none">
              <span>{story.date}</span>
              {story.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {story.location}
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(story.id);
              }}
              className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-400 transition-colors cursor-pointer"
              aria-label="Save story"
            >
              <Heart
                className={`w-3 h-3 ${
                  bookmarked ? 'fill-rose-400 text-rose-400' : ''
                }`}
              />
            </button>
          </div>
        )}

        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            {!story.coverImage && (
              <div className="flex items-center justify-between text-xs theme-text-muted mb-1.5">
                <span className="font-mono text-[10px]">{story.date}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(story.id);
                  }}
                  className="p-1 theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                  aria-label="Save story"
                >
                  <Heart className={`w-3 h-3 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            )}

            <h3 className="font-serif text-base font-medium theme-text-primary group-hover:theme-accent transition-colors leading-snug line-clamp-2">
              {title}
            </h3>

            {excerpt && (
              <p className="mt-1.5 text-xs theme-text-secondary leading-relaxed line-clamp-2">
                {excerpt}
              </p>
            )}
          </div>

          <div
            className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] theme-text-muted font-mono"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span>{story.category || story.type}</span>
            {story.soundtrack?.enabled && <Volume2 className="w-3 h-3 theme-accent" />}
          </div>
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // 6. PORTRAIT CARD (Vertical photographic or artwork focus)
  // -------------------------------------------------------------
  if (effectiveVariant === 'portrait' && story.coverImage) {
    return (
      <article
        onClick={() => onSelectStory(story)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border theme-surface theme-border flex flex-col justify-between h-full ${className}`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
          <img
            src={story.coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

          {overlayQuote && (
            <div className="absolute top-5 left-4 right-4 text-white pointer-events-none">
              <p className="font-handwritten text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line">
                {overlayQuote}
              </p>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 text-white pointer-events-none">
            <span className="text-[10px] font-mono opacity-80 block mb-0.5">{story.date}</span>
            <h3 className="font-serif text-lg font-medium text-white leading-snug drop-shadow-sm">
              {title}
            </h3>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-400 transition-colors cursor-pointer"
            aria-label="Save story"
          >
            <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-400 text-rose-400' : ''}`} />
          </button>
        </div>

        {excerpt && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs theme-text-secondary leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          </div>
        )}
      </article>
    );
  }

  // -------------------------------------------------------------
  // 7. STANDARD EDITORIAL CARD (The versatile baseline)
  // -------------------------------------------------------------
  return (
    <article
      onClick={() => onSelectStory(story)}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border theme-surface theme-border flex flex-col justify-between h-full ${className}`}
    >
      {/* Cover Image Container */}
      {story.coverImage && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900 shrink-0">
          <img
            src={story.coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Tested high-contrast gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

          {/* Overlaid Quote / Typography */}
          {overlayQuote ? (
            <div className="absolute top-5 left-5 right-5 text-white pointer-events-none">
              <p
                className="font-handwritten text-xl md:text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-pre-line tracking-wide"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                {overlayQuote}
              </p>
            </div>
          ) : null}

          {/* Bottom metadata over photo */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-[11px] font-mono pointer-events-none drop-shadow-sm">
            <span>{story.date}</span>
            {story.location && (
              <span className="flex items-center gap-1 text-white">
                <MapPin className="w-3 h-3" />
                {story.location}
              </span>
            )}
          </div>

          {/* Heart Bookmark */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(story.id);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:text-rose-400 transition-colors cursor-pointer"
            aria-label="Save story"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                bookmarked ? 'fill-rose-400 text-rose-400' : ''
              }`}
            />
          </button>
        </div>
      )}

      {/* Text Details */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
            {!story.coverImage && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px]">{story.date}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(story.id);
                  }}
                  className="p-1 theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                  aria-label="Save story"
                >
                  <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            )}
            <span className="text-[10px] font-mono tracking-wider ml-auto px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
              {story.category || 'Journal'}
            </span>
          </div>

          <h3 className="font-serif text-lg font-medium theme-text-primary group-hover:theme-accent transition-colors leading-snug">
            {title}
          </h3>

          {excerpt && (
            <p className="mt-2 text-xs theme-text-secondary leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          )}
        </div>

        <div
          className="mt-4 pt-3 border-t flex items-center justify-between text-xs theme-text-muted"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-[11px] font-mono">{story.readingTimeMinutes} min read</span>
          {story.soundtrack?.enabled && (
            <span className="flex items-center gap-1 text-[11px] theme-accent font-medium">
              <Volume2 className="w-3 h-3" />
              {t.story.soundtrack}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
