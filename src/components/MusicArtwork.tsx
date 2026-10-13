import React, { useState } from 'react';
import { Music2 } from 'lucide-react';

export const MusicArtwork: React.FC<{
  artworkUrl?: string;
  alt: string;
  className?: string;
}> = ({ artworkUrl, alt, className = '' }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showArtwork = Boolean(artworkUrl && failedUrl !== artworkUrl);

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 text-neutral-400 dark:bg-white/10 ${className}`}>
      {showArtwork ? (
        <img
          src={artworkUrl}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedUrl(artworkUrl || null)}
        />
      ) : (
        <Music2 aria-hidden="true" className="h-1/2 w-1/2" />
      )}
    </span>
  );
};
