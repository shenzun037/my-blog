import React from 'react';
import { Story } from '../types/journal';
import { StoryCard } from './StoryCard';

interface EditorialMosaicProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  className?: string;
}

export const EditorialMosaic: React.FC<EditorialMosaicProps> = ({
  stories,
  onSelectStory,
  className = '',
}) => {
  if (!stories || stories.length === 0) {
    return null;
  }

  // Check if content is primarily text (e.g. quote/thought section)
  const imageStoryCount = stories.filter((s) => !!s.coverImage).length;
  const isPredominantlyText = imageStoryCount === 0 || imageStoryCount / stories.length < 0.25;

  // ------------------------------------------------------------------
  // 1. PREDOMINANTLY TEXT MODE (Literary Shelf Layout)
  // Ensures quotes & reflections are beautifully proportioned without
  // arbitrary photo boxes or vertical voids.
  // ------------------------------------------------------------------
  if (isPredominantlyText) {
    if (stories.length === 1) {
      return (
        <div className={`max-w-2xl mx-auto py-6 ${className}`}>
          <StoryCard story={stories[0]} onSelectStory={onSelectStory} variant="quote" />
        </div>
      );
    }

    if (stories.length === 2) {
      return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onSelectStory={onSelectStory}
              variant={story.type === 'quote' ? 'quote' : 'standard'}
            />
          ))}
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onSelectStory={onSelectStory}
            variant={story.type === 'quote' ? 'quote' : 'standard'}
          />
        ))}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 2. SMALL SETS (1, 2, or 3 stories)
  // ------------------------------------------------------------------
  if (stories.length === 1) {
    return (
      <div className={`max-w-3xl mx-auto py-4 ${className}`}>
        <StoryCard story={stories[0]} onSelectStory={onSelectStory} variant="featured" />
      </div>
    );
  }

  if (stories.length === 2) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
        <StoryCard story={stories[0]} onSelectStory={onSelectStory} variant="wide" />
        <StoryCard story={stories[1]} onSelectStory={onSelectStory} variant="wide" />
      </div>
    );
  }

  if (stories.length === 3) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onSelectStory={onSelectStory}
            variant="standard"
          />
        ))}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 3. EDITORIAL CLUSTERING ENGINE (>= 4 stories)
  // Deterministic, balanced partitioning:
  // - Lead Mosaic (Lead 7 cols + 2 stacked cards 5 cols)
  // - Editorial Trio (3 balanced columns)
  // - Editorial Duo (2 wide cards)
  // - Quartet Grid (4 balanced cards)
  // ------------------------------------------------------------------
  const clusters: React.ReactNode[] = [];
  let index = 0;
  let clusterCount = 0;

  while (index < stories.length) {
    const remaining = stories.length - index;

    // Pattern A: Lead Mosaic (takes 3 stories) when at least 5 remain OR exactly 3 remain
    if (remaining >= 5 || remaining === 3) {
      const trio = stories.slice(index, index + 3);
      index += 3;

      // Identify the best lead story: prioritize featured or photo story
      let leadIdx = trio.findIndex((s) => s.isFeatured && !!s.coverImage);
      if (leadIdx === -1) {
        leadIdx = trio.findIndex((s) => !!s.coverImage);
      }
      if (leadIdx === -1) leadIdx = 0;

      const leadStory = trio[leadIdx];
      const sideStories = trio.filter((_, i) => i !== leadIdx);

      const isLeadLeft = clusterCount % 2 === 0;
      clusterCount++;

      clusters.push(
        <section
          key={`cluster-lead-${index}`}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          aria-label="Editorial lead feature and reflections"
        >
          {isLeadLeft ? (
            <>
              {/* Lead Story: 7 Columns */}
              <div className="lg:col-span-7 flex flex-col">
                <StoryCard
                  story={leadStory}
                  onSelectStory={onSelectStory}
                  variant="featured"
                  className="h-full"
                />
              </div>

              {/* Supporting Side Stack: 5 Columns (2 stacked cards balancing height) */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                <StoryCard
                  story={sideStories[0]}
                  onSelectStory={onSelectStory}
                  variant={sideStories[0].type === 'quote' ? 'quote' : 'compact'}
                  className="h-full"
                />
                <StoryCard
                  story={sideStories[1]}
                  onSelectStory={onSelectStory}
                  variant={sideStories[1].type === 'quote' ? 'quote' : 'compact'}
                  className="h-full"
                />
              </div>
            </>
          ) : (
            <>
              {/* Supporting Side Stack: 5 Columns */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 order-2 lg:order-1">
                <StoryCard
                  story={sideStories[0]}
                  onSelectStory={onSelectStory}
                  variant={sideStories[0].type === 'quote' ? 'quote' : 'compact'}
                  className="h-full"
                />
                <StoryCard
                  story={sideStories[1]}
                  onSelectStory={onSelectStory}
                  variant={sideStories[1].type === 'quote' ? 'quote' : 'compact'}
                  className="h-full"
                />
              </div>

              {/* Lead Story: 7 Columns */}
              <div className="lg:col-span-7 flex flex-col order-1 lg:order-2">
                <StoryCard
                  story={leadStory}
                  onSelectStory={onSelectStory}
                  variant="featured"
                  className="h-full"
                />
              </div>
            </>
          )}
        </section>
      );
      continue;
    }

    // Pattern B: Exactly 4 stories remaining -> Quartet Grid (4 columns or 2x2)
    if (remaining === 4) {
      const quartet = stories.slice(index, index + 4);
      index += 4;
      clusters.push(
        <section
          key={`cluster-quartet-${index}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          aria-label="Journal photo and story collection"
        >
          {quartet.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onSelectStory={onSelectStory}
              variant={story.type === 'quote' ? 'quote' : 'standard'}
              className="h-full"
            />
          ))}
        </section>
      );
      continue;
    }

    // Pattern C: Exactly 2 stories remaining -> Editorial Duo (2 wide cards)
    if (remaining === 2) {
      const duo = stories.slice(index, index + 2);
      index += 2;
      clusters.push(
        <section
          key={`cluster-duo-${index}`}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          aria-label="Editorial story pair"
        >
          {duo.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onSelectStory={onSelectStory}
              variant={story.type === 'quote' ? 'quote' : 'wide'}
              className="h-full"
            />
          ))}
        </section>
      );
      continue;
    }

    // Pattern D: Exactly 1 story remaining -> Full-width Wide Editorial Feature
    if (remaining === 1) {
      const single = stories[index];
      index += 1;
      clusters.push(
        <section
          key={`cluster-single-${index}`}
          className="w-full"
          aria-label="Featured journal entry"
        >
          <StoryCard
            story={single}
            onSelectStory={onSelectStory}
            variant="wide"
            className="w-full"
          />
        </section>
      );
      continue;
    }
  }

  return (
    <div className={`space-y-10 ${className}`}>
      {clusters}
    </div>
  );
};
