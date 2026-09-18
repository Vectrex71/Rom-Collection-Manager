import React, { useEffect, useRef } from 'react';

interface BackgroundMediaProps {
  isWorking: boolean;
}

export const BackgroundMedia: React.FC<BackgroundMediaProps> = ({ isWorking }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isWorking) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // In some browser setups autoplay might be constrained if not muted
          console.warn('Background video play failed:', err);
        });
      }
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (err) {
        console.warn('Error resetting background video to first frame:', err);
      }
    }
  }, [isWorking]);

  return (
    <div
      id="app-background-media"
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/Background.mp4"
        poster="/Background.jpeg"
        muted
        playsInline
        loop
        preload="auto"
        className="w-full h-full object-cover object-center"
      />
      {/* Deep atmospheric overlay with subtle radial vignette for razor-sharp text legibility and rich contrast */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(13, 19, 38, 0.42) 0%, rgba(8, 12, 24, 0.88) 100%)',
        }}
      />
      {/* Subtle grid pattern texture for high-tech retro-arcade feel */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
};
