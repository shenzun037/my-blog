/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JournalProvider, useJournal } from './context/JournalContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { JournalFeed } from './components/JournalFeed';
import { StoryDetail } from './components/StoryDetail';
import { FavoritesView } from './components/FavoritesView';
import { AboutView } from './components/AboutView';
import { ContactView } from './components/ContactView';
import { AdminCMS } from './components/AdminCMS';
import { AudioPlayerDock } from './components/AudioPlayerDock';
import { MusicPlaybackEngine } from './components/MusicPlaybackEngine';
import { Story } from './types/journal';

function MainApp() {
  const { stories, currentTheme } = useJournal();

  // Navigation / View state
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Deep linking via URL hash support
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('story/')) {
        const slug = hash.replace('story/', '');
        const found = stories.find((s) => s.slug === slug || s.id === slug);
        if (found) {
          setActiveStory(found);
          setCurrentTab('story');
        }
      } else if (hash === 'favorites') {
        setCurrentTab('favorites');
        setActiveStory(null);
      } else if (hash === 'about') {
        setCurrentTab('about');
        setActiveStory(null);
      } else if (hash === 'contact') {
        setCurrentTab('contact');
        setActiveStory(null);
      } else if (hash === 'admin') {
        setShowAdmin(true);
      } else if (hash === 'photos') {
        setCurrentTab('photos');
        setActiveStory(null);
      } else if (hash === 'journal' || hash === 'thoughts') {
        // Keep legacy #thoughts links working, but route them to the combined Journal feed.
        setCurrentTab('journal');
        setActiveStory(null);
      } else if (!hash) {
        setCurrentTab('home');
        setActiveStory(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [stories]);

  const handleSelectStory = (story: Story) => {
    setActiveStory(story);
    setCurrentTab('story');
    window.location.hash = `story/${story.slug}`;
  };

  const handleBackToFeed = () => {
    setActiveStory(null);
    setCurrentTab('home');
    window.location.hash = '';
  };

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setActiveStory(null);
    if (tab === 'home') {
      window.location.hash = '';
    } else if (tab === 'journal') {
      window.location.hash = 'journal';
    } else if (tab === 'admin') {
      setShowAdmin(true);
    } else {
      window.location.hash = tab;
    }
  };

  // If Admin CMS is open in overlay/fullscreen mode
  if (showAdmin) {
    return (
      <AdminCMS
        onClose={() => {
          setShowAdmin(false);
          if (window.location.hash === '#admin') {
            window.location.hash = '';
          }
        }}
        onSelectStoryForPreview={(story) => {
          setShowAdmin(false);
          handleSelectStory(story);
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-500 font-sans ${currentTheme.bgClass} ${currentTheme.textClass}`}
      style={{ backgroundColor: currentTheme.bgHex }}
    >
      {/* Sidebar (Desktop Persistent / Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar (when not in full story reading mode) */}
        {currentTab !== 'story' && (
          <TopBar
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenAdmin={() => setShowAdmin(true)}
          />
        )}

        {/* View Routing */}
        <main className="flex-1 pb-16">
          {currentTab === 'story' && activeStory ? (
            <StoryDetail
              story={activeStory}
              onBack={handleBackToFeed}
              onSelectStory={handleSelectStory}
            />
          ) : currentTab === 'favorites' ? (
            <FavoritesView
              onSelectStory={handleSelectStory}
              onExplore={() => handleSelectTab('home')}
            />
          ) : currentTab === 'about' ? (
            <AboutView
              onContactClick={() => handleSelectTab('contact')}
            />
          ) : currentTab === 'contact' ? (
            <ContactView />
          ) : (
            <JournalFeed
              onSelectStory={handleSelectStory}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              sectionFilter={
                currentTab === 'photos'
                  ? 'photos'
                  : currentTab === 'journal'
                  ? 'journal'
                  : 'all'
              }
            />
          )}
        </main>
      </div>

      {/* Mobile compact music dock */}
      <div className="lg:hidden fixed bottom-4 right-4 left-4 z-30">
        <AudioPlayerDock compact />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <JournalProvider>
      <MainApp />
      <MusicPlaybackEngine />
    </JournalProvider>
  );
}
