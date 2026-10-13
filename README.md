<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f8d2511b-86b1-4ccf-ad01-54c60c0fdd09

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## MP3 music library

Shenzun's music library accepts administrator-uploaded MP3 files up to 1 GB. In the authenticated Music Library or Story Editor, the title defaults to the filename without `.mp3` (underscores and hyphens become spaces) and can be edited; artist is optional. You can upload an optional JPG, PNG, or WebP cover up to 50 MB with a track, or add/change a cover later from its library row. MP3s and covers stream to `public/uploads`; SQLite stores their URLs and track metadata. Keep enough free disk space on the server for these files. No provider API keys are needed.

Readers use the compact music dock to choose a track and control actual browser playback. Play never starts automatically. The seek bar, duration, volume, and play state are driven by the browser's audio element. Follow Story selects a story's associated MP3 on navigation, Lock Current Audio preserves the reader's selection, and Audio Off pauses playback and prevents story-based changes. Removing an MP3 clears its story associations and deletes the uploaded file.

On first server startup after this migration, old Spotify/YouTube library entries and their story associations are cleared. A recoverable JSON snapshot is written to `data/backups/removed_external_music_*.json`; story text, story favorites, themes, and audio-mode preferences are preserved. Upload only audio that you are authorized to use.

Run MP3 validation and story-selection tests with `npm run test:music`; run upload streaming and size-limit tests with `npm run test:upload`.

## Clear stories without removing settings or media

Stop the dev server with `Ctrl+C`, then run `npm run clear:stories`. This removes rows from the `stories` table only and saves a full SQLite backup under `data/backups/` first. Site settings, media records, messages, and files in `public/uploads/` are preserved. Start the app again with `npm run dev`.
