// ============================================
// Queen International School - Logo Component
// Optimized for Electron & Browser
// ============================================

import React from 'react';

interface LogoProps {
  size: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size, className = '' }) => {
  // Maintaining aspect ratio (Image provided is roughly 3:2)
  const width = size * 1.5;
  const height = size;

  return (
    <div
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'relative'
      }}
      className={`flex items-center justify-center ${className}`}
    >
      {/* 1. Try to load external logo.png first */}
      <img 
        src="logo.png" 
        alt="School Logo"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2
        }}
        onError={(e) => {
          // If logo.png fails, hide the img and show the SVG fallback
          (e.target as HTMLImageElement).style.opacity = '0';
          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
          if (fallback) fallback.style.opacity = '1';
        }}
      />

      {/* 2. SVG Fallback (Always exists behind, becomes visible if img fails) */}
      <div
        style={{ 
          width: '100%', 
          height: '100%', 
          opacity: 0, // Hidden by default
          transition: 'opacity 0.3s ease',
          background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        <div className="text-center">
          <span style={{ fontSize: `${size * 0.4}px` }} className="text-white font-bold block leading-none">QUEEN</span>
          <span style={{ fontSize: `${size * 0.15}px` }} className="text-amber-100 font-bold block">INTERNATIONAL</span>
        </div>
      </div>
    </div>
  );
};
