import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  List as ListIcon,
  AlignJustify,
  Shuffle,
  X,
  MapPin,
  Heart,
  Compass,
} from 'lucide-react';
import { Story, MoodType, StoryType } from '../types/journal';
import { useJournal } from '../context/JournalContext';
import { StoryCard } from './StoryCard';
import { EditorialMosaic } from './EditorialMosaic';

interface JournalFeedProps {
  onSelectStory: (story: Story) => void;
  searchQuery: string;
  onClearSearch?: () => void;
  sectionFilter?: 'all' | 'photos' | 'thoughts' | 'journal';
}

export const JournalFeed: React.FC<JournalFeedProps> = ({
  onSelectStory,
  searchQuery,
  onClearSearch,
  sectionFilter = 'all',
}) => {
  const { stories, language, t, isFavorite, toggleBookmark } = useJournal();

  const [selectedMood, setSelectedMood] = useState<MoodType | 'all'>('all');
  const [selectedType, setSelectedType] = useState<StoryType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'mosaic' | 'list' | 'compact'>('mosaic');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [stories]);

  // Filter & Search Logic
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // 1. Navigation Section Filter
      if (sectionFilter === 'photos') {
        if (story.type !== 'photo' && story.type !== 'anime' && !story.coverImage) {
          return false;
        }
      } else if (sectionFilter === 'journal') {
        if (!['quote', 'note', 'diary', 'mixed'].includes(story.type)) {
          return false;
        }
      }

      // 2. Mood filter
      if (selectedMood !== 'all' && story.mood !== selectedMood) {
        return false;
      }

      // 3. Medium type filter
      if (selectedType !== 'all' && story.type !== selectedType) {
        return false;
      }

      // 4. Tag filter
      if (selectedTag !== 'all' && !story.tags.includes(selectedTag)) {
        return false;
      }

      // 5. Text Search (Titles, Excerpt, Content Blocks, Tags, Location, Quotes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleEn = (story.title?.en || '').toLowerCase();
        const titleTh = (story.title?.th || '').toLowerCase();
        const excerptEn = (story.excerpt?.en || '').toLowerCase();
        const excerptTh = (story.excerpt?.th || '').toLowerCase();
        const location = (story.location || '').toLowerCase();
        const tags = story.tags.map((t) => t.toLowerCase()).join(' ');
        const quoteEn = (story.overlayQuote?.en || '').toLowerCase();
        const quoteTh = (story.overlayQuote?.th || '').toLowerCase();

        const blocksText = story.contentBlocks
          .map((b) => `${b.textEn || ''} ${b.textTh || ''} ${b.itemsEn?.join(' ') || ''} ${b.itemsTh?.join(' ') || ''}`)
          .join(' ')
          .toLowerCase();

        const matches =
          titleEn.includes(query) ||
          titleTh.includes(query) ||
          excerptEn.includes(query) ||
          excerptTh.includes(query) ||
          location.includes(query) ||
          tags.includes(query) ||
          quoteEn.includes(query) ||
          quoteTh.includes(query) ||
          blocksText.includes(query);

        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [stories, sectionFilter, selectedMood, selectedType, selectedTag, searchQuery, sortBy]);

  const handleClearAllFilters = () => {
    setSelectedMood('all');
    setSelectedType('all');
    setSelectedTag('all');
    if (onClearSearch) onClearSearch();
  };

  const handleRandomStory = () => {
    const pool = filteredStories.length > 0 ? filteredStories : stories;
    if (pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      onSelectStory(random);
    }
  };

  const hasActiveFilters =
    selectedMood !== 'all' ||
    selectedType !== 'all' ||
    selectedTag !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Section Header Title if filtering by section */}
      {sectionFilter !== 'all' && (
        <div
          className="mb-6 pb-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-serif text-2xl md:text-3xl font-normal theme-text-primary capitalize">
            {sectionFilter === 'photos' && (language === 'th' ? 'ภาพถ่ายทั้งหมด' : 'Photo Stories')}
            {sectionFilter === 'journal' && (language === 'th' ? 'บันทึกและความคิด' : 'Journal')}
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            {sectionFilter === 'photos' && (language === 'th' ? 'ช่วงเวลาที่ถูกบันทึกผ่านแสงและเลนส์' : 'Moments captured through natural light and quiet frames')}
            {sectionFilter === 'journal' && (language === 'th' ? 'รวมความคิด คำคม บันทึกสั้น และเรื่องเล่า' : 'Thoughts, quotes, notes, and diary entries in one place')}
          </p>
        </div>
      )}

      {/* Editorial Filter & Toolbar */}
      <div
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Mood & Media Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Mood filter selector */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => setSelectedMood('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedMood === 'all'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {t.feed.allMoods}
            </button>
            <button
              onClick={() => setSelectedMood('peaceful')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedMood === 'peaceful'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'สงบ' : 'Peaceful'}
            </button>
            <button
              onClick={() => setSelectedMood('melancholy')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedMood === 'melancholy'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'หม่นเศร้า' : 'Melancholy'}
            </button>
            <button
              onClick={() => setSelectedMood('nostalgic')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedMood === 'nostalgic'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'หวนคิดถึง' : 'Nostalgic'}
            </button>
            <button
              onClick={() => setSelectedMood('happy')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedMood === 'happy'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'สดใส' : 'Happy'}
            </button>
          </div>

          {/* Type filter selector */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedType === 'all'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {t.feed.allTypes}
            </button>
            <button
              onClick={() => setSelectedType('photo')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedType === 'photo'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'ภาพถ่าย' : 'Photos'}
            </button>
            <button
              onClick={() => setSelectedType('quote')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedType === 'quote'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'คำคม' : 'Quotes'}
            </button>
            <button
              onClick={() => setSelectedType('anime')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                selectedType === 'anime'
                  ? 'theme-surface theme-text-primary shadow-xs font-semibold'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              {language === 'th' ? 'อนิเมะ' : 'Anime'}
            </button>
          </div>

          {/* Tag filter dropdown if tags exist */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs theme-input focus:outline-none cursor-pointer"
              aria-label="Filter by tag"
            >
              <option value="all">All Tags ({allTags.length})</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="p-1.5 theme-text-muted hover:theme-text-primary transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.feed.clearFilters}</span>
            </button>
          )}
        </div>

        {/* View Mode & Random Story Actions */}
        <div className="flex items-center gap-3 text-xs">
          {/* Result Count */}
          <span className="text-[11px] theme-text-muted font-mono hidden sm:inline">
            {t.feed.searchResultCount.replace('{count}', String(filteredStories.length))}
          </span>

          <button
            onClick={handleRandomStory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border theme-surface hover:theme-border-strong theme-text-primary transition-colors cursor-pointer"
            title="Read a randomly selected story"
          >
            <Shuffle className="w-3.5 h-3.5 theme-accent" />
            <span>{t.feed.randomStory}</span>
          </button>

          {/* View Mode Toggles (Mosaic, Diary List, Compact Archive) */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => setViewMode('mosaic')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'mosaic'
                  ? 'theme-surface theme-text-primary shadow-xs'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title={t.feed.viewMosaic}
              aria-label={t.feed.viewMosaic}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'theme-surface theme-text-primary shadow-xs'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title={t.feed.viewList}
              aria-label={t.feed.viewList}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'compact'
                  ? 'theme-surface theme-text-primary shadow-xs'
                  : 'theme-text-muted hover:theme-text-primary'
              }`}
              title={t.feed.viewCompact}
              aria-label={t.feed.viewCompact}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stories Grid / Feed */}
      {filteredStories.length === 0 ? (
        <div className="py-24 text-center max-w-md mx-auto">
          <Compass className="w-8 h-8 mx-auto theme-text-muted mb-4" />
          <h3 className="font-serif text-xl font-normal theme-text-primary mb-2">
            {t.feed.emptyTitle}
          </h3>
          <p className="text-xs theme-text-muted leading-relaxed font-light mb-6">
            {t.feed.emptyDesc}
          </p>
          <button
            onClick={handleClearAllFilters}
            className="px-4 py-2 rounded-full theme-accent-bg text-xs font-medium cursor-pointer"
          >
            {t.feed.clearFilters}
          </button>
        </div>
      ) : viewMode === 'mosaic' ? (
        /* 1. EDITORIAL MOSAIC GRID (Balanced clusters, disciplined aspect ratios, zero empty voids) */
        <EditorialMosaic
          stories={filteredStories}
          onSelectStory={onSelectStory}
        />
      ) : viewMode === 'list' ? (
        /* 2. COMFORTABLE DIARY LIST */
        <div className="max-w-2xl mx-auto space-y-6">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onSelectStory={onSelectStory}
            />
          ))}
        </div>
      ) : (
        /* 3. COMPACT CHRONOLOGICAL ARCHIVE TIMELINE */
        <div
          className="max-w-3xl mx-auto divide-y"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {filteredStories.map((story) => {
            const title = language === 'th' ? (story.title.th || story.title.en) : story.title.en;
            return (
              <article
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="py-4 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-4 group hover:theme-surface-raised"
              >
                <div className="flex items-baseline gap-4 min-w-0">
                  <span className="font-mono text-xs theme-text-muted shrink-0 tabular-nums">
                    {story.date}
                  </span>
                  <h3 className="font-serif text-base font-normal theme-text-primary group-hover:theme-accent transition-colors truncate">
                    {title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs theme-text-muted">
                  {story.location && (
                    <span className="hidden sm:flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3" />
                      {story.location}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--color-surface-muted)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {story.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(story.id);
                    }}
                    className="p-1 hover:text-rose-500 transition-colors"
                    aria-label="Save story"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFavorite(story.id) ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer Tagline */}
      <footer
        className="mt-20 pt-10 border-t text-center text-xs theme-text-muted font-mono tracking-widest"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span>{t.header.footerTagline}</span>
      </footer>
    </div>
  );
};
