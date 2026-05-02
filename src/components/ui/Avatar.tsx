import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  url?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({ url, alt = "Profile", className, fallbackClassName }: AvatarProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [url]);

  if (!url || error) {
    return (
      <div className={cn("bg-brand-bg flex items-center justify-center overflow-hidden shrink-0", className, fallbackClassName)}>
        <User className="w-1/2 h-1/2 text-text-dim" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={cn("bg-brand-bg flex items-center justify-center overflow-hidden shrink-0", className, fallbackClassName)}>
          <User className="w-1/2 h-1/2 text-text-dim animate-pulse" />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className={cn("object-cover shrink-0", className, !loaded && "hidden")}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}
