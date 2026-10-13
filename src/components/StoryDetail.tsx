import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  Share2,
  Check,
  MapPin,
  Volume2,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import { Story } from '../types/journal';
import { useJournal } from '../context/JournalContext';

interface StoryDetailProps {
  story: Story;
  onBack: () => void;
  onSelectStory: (story: Story) => void;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({
  story,
  onBack,
  onSelectStory,
}) => {
  const {
    applyStoryTheme,
    applyStoryAudio,
    selectTrack,
    restoreDefaultTheme,
    language,
    t,
    isFavorite,
    toggleBookmark,
    stories,
    settings,
  } = useJournal();

  const [copied, setCopied] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Apply theme & companion audio on mount
  useEffect(() => {
    applyStoryTheme(story);
    applyStoryAudio(story);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      restoreDefaultTheme();
    };
  }, [story, applyStoryTheme, applyStoryAudio, restoreDefaultTheme]);

  const storySoundtrack = story.soundtrack?.enabled
    ? (settings.musicLibrary || []).find((track) => track.id === story.soundtrack?.trackId && track.enabled)
    : undefined;

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) {
        setScrollProgress((window.scrollY / total) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement('input');
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const title = language === 'th' ? (story.title.th || story.title.en) : story.title.en;
  const isUntranslated = language === 'th' && !story.title.th;
  const bookmarked = isFavorite(story.id);

  // Related stories calculation based on published stories
  const relatedStories = stories
    .filter(
      (s) =>
        s.id !== story.id &&
        s.isPublished &&
        (s.mood === story.mood || s.tags.some((t) => story.tags.includes(t)))
    )
    .slice(0, 3);

  // Prev / Next stories
  const publishedStories = stories.filter((s) => s.isPublished);
  const currentIndex = publishedStories.findIndex((s) => s.id === story.id);
  const prevStory = currentIndex > 0 ? publishedStories[currentIndex - 1] : null;
  const nextStory = currentIndex < publishedStories.length - 1 ? publishedStories[currentIndex + 1] : null;

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300 theme-page-bg">
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 theme-surface-muted">
        <div
          className="h-full theme-accent-bg transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Navigation Header */}
      {!distractionFree && (
        <div
          className="sticky top-0 z-30 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b transition-colors theme-surface theme-border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <button
            onClick={() => {
              restoreDefaultTheme();
              onBack();
            }}
            className="flex items-center gap-2 text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.story.back}</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Distraction free toggle */}
            <button
              onClick={() => setDistractionFree(true)}
              className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
              title={t.story.distractionFree}
              aria-label={t.story.distractionFree}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => toggleBookmark(story.id)}
              className="p-1.5 rounded-lg theme-text-muted hover:text-rose-500 transition-colors cursor-pointer"
              title={bookmarked ? t.story.saved : t.story.save}
              aria-label={bookmarked ? t.story.saved : t.story.save}
            >
              <Heart
                className={`w-4 h-4 ${
                  bookmarked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border theme-border theme-text-primary text-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
              title={t.story.share}
              aria-label={t.story.share}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 theme-accent" />
                  <span className="text-[11px] theme-accent font-medium">
                    {t.story.copied}
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 theme-text-muted" />
                  <span>{t.story.share}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Exit Button for Distraction-Free Mode */}
      {distractionFree && (
        <button
          onClick={() => setDistractionFree(false)}
          className="fixed top-6 right-6 z-50 p-2.5 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2 text-xs cursor-pointer theme-accent-bg"
        >
          <EyeOff className="w-4 h-4" />
          <span>{t.story.distractionFreeExit}</span>
        </button>
      )}

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-6 pt-12 md:pt-16">
        {/* Untranslated notice if applicable */}
        {isUntranslated && (
          <div
            className="mb-6 p-3 rounded-xl border text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Compass className="w-4 h-4 shrink-0 theme-accent" />
            <span>{t.story.untranslatedFallback}</span>
          </div>
        )}

        {/* Story Metadata Header */}
        <header className="mb-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs theme-text-muted font-mono mb-4">
            <span>{story.date}</span>
            {story.location && (
              <>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {story.location}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {story.readingTimeMinutes} {t.story.minRead}
            </span>
            {storySoundtrack && (
              <>
                <span aria-hidden="true">·</span>
                <button type="button" onClick={() => selectTrack(storySoundtrack)} className="flex items-center gap-1 theme-accent font-sans font-medium hover:underline underline-offset-2">
                  <Volume2 className="w-3 h-3" />
                  {t.story.soundtrack}{storySoundtrack.title ? ` · ${storySoundtrack.title}` : ''}
                </button>
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-normal tracking-tight theme-text-primary text-balance leading-tight mb-4">
            {title}
          </h1>

          {/* Tags */}
          {story.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs theme-text-muted">
              {story.tags.map((tag, idx) => (
                <React.Fragment key={tag}>
                  <span>#{tag}</span>
                  {idx < story.tags.length - 1 && <span aria-hidden="true">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </header>

        {/* Hero Cover Image if present */}
        {story.coverImage && (
          <div className="mb-12 rounded-3xl overflow-hidden shadow-md bg-neutral-900 border theme-border">
            <img
              src={story.coverImage}
              alt={title}
              className="w-full max-h-[560px] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Content Blocks */}
        <div className="space-y-8 theme-text-primary text-base md:text-lg leading-relaxed font-light">
          {story.contentBlocks.map((block) => {
            const text = language === 'th' ? (block.textTh || block.textEn) : block.textEn;
            const caption = language === 'th' ? (block.captionTh || block.captionEn) : block.captionEn;

            switch (block.type) {
              case 'paragraph':
                return (
                  <p key={block.id} className="tracking-wide">
                    {text}
                  </p>
                );

              case 'heading':
                return (
                  <h2
                    key={block.id}
                    className="font-serif text-2xl md:text-3xl font-medium theme-text-primary mt-10 mb-4"
                  >
                    {text}
                  </h2>
                );

              case 'quote':
                return (
                  <blockquote
                    key={block.id}
                    className="my-8 p-6 md:p-8 rounded-2xl border text-center theme-surface-raised theme-border"
                  >
                    <p className="font-serif text-xl md:text-2xl italic leading-relaxed theme-text-primary">
                      “{text}”
                    </p>
                  </blockquote>
                );

              case 'image':
                const layout = block.layout || 'centered';
                return (
                  <figure
                    key={block.id}
                    className={`my-8 ${
                      layout === 'full' ? 'max-w-none -mx-4 md:-mx-12' : layout === 'portrait' ? 'max-w-md mx-auto' : ''
                    }`}
                  >
                    <img
                      src={block.imageUrl}
                      alt={block.alt || title}
                      className="w-full rounded-2xl shadow-sm object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {caption && (
                      <figcaption className="text-center text-xs theme-text-muted mt-2.5 font-light italic">
                        {caption}
                      </figcaption>
                    )}
                  </figure>
                );

              case 'gallery':
                return (
                  <div key={block.id} className="my-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {block.images?.map((img, i) => (
                      <figure key={i} className="space-y-1">
                        <img
                          src={img.url}
                          alt={img.alt || ''}
                          className="w-full h-64 object-cover rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                        {img.caption && (
                          <figcaption className="text-center text-[11px] theme-text-muted italic">
                            {img.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                );

              case 'noteList':
                const items = language === 'th' ? (block.itemsTh || block.itemsEn) : block.itemsEn;
                return (
                  <div
                    key={block.id}
                    className="my-6 p-6 rounded-2xl border theme-surface-raised theme-border"
                  >
                    <ul className="space-y-2 text-sm theme-text-secondary">
                      {items?.map((item, idx) => (
                        <li key={idx} className="font-light">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );

              case 'divider':
                return (
                  <div key={block.id} className="my-10 flex items-center justify-center">
                    <span className="theme-text-muted font-mono tracking-widest opacity-60">
                      · · ·
                    </span>
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>

        {/* End of Story Mark */}
        <div
          className="mt-16 pt-8 border-t text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="font-serif italic text-sm theme-text-muted">
            {t.header.footerTagline}
          </p>
        </div>

        {/* Story Pagination Navigation */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {prevStory ? (
            <button
              onClick={() => onSelectStory(prevStory)}
              className="p-4 rounded-xl border theme-border theme-surface text-left transition-colors group cursor-pointer hover:theme-border-strong"
            >
              <div className="text-[11px] theme-text-muted font-mono uppercase mb-1">
                ← {t.story.prev}
              </div>
              <div className="font-serif text-base theme-text-primary group-hover:theme-accent truncate">
                {language === 'th' ? (prevStory.title.th || prevStory.title.en) : prevStory.title.en}
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextStory ? (
            <button
              onClick={() => onSelectStory(nextStory)}
              className="p-4 rounded-xl border theme-border theme-surface text-right transition-colors group cursor-pointer hover:theme-border-strong"
            >
              <div className="text-[11px] theme-text-muted font-mono uppercase mb-1">
                {t.story.next} →
              </div>
              <div className="font-serif text-base theme-text-primary group-hover:theme-accent truncate">
                {language === 'th' ? (nextStory.title.th || nextStory.title.en) : nextStory.title.en}
              </div>
            </button>
          ) : (
            <div />
          )}
        </div>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <section
            className="mt-16 pt-10 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h3 className="font-serif text-xl font-normal theme-text-primary mb-6">
              {t.story.related}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedStories.map((rel) => {
                const relTitle = language === 'th' ? (rel.title.th || rel.title.en) : rel.title.en;
                return (
                  <div
                    key={rel.id}
                    onClick={() => onSelectStory(rel)}
                    className="p-4 rounded-xl border theme-border theme-surface hover:theme-border-strong transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] font-mono theme-text-muted block mb-1">
                      {rel.date}
                    </span>
                    <h4 className="font-serif text-sm theme-text-primary font-medium line-clamp-2">
                      {relTitle}
                    </h4>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
