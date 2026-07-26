import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 34, className }) => (
  <div
    className={`flex items-center justify-center rounded-xl flex-shrink-0 overflow-hidden ${className || ''}`}
    style={{
      width: size,
      height: size,
      background: 'var(--gradient-primary)',
      boxShadow: '0 2px 8px rgba(255,127,0,0.35)',
    }}
  >
    <img src="/logo.svg" alt="DaloaMarket" className="w-full h-full object-contain p-1" />
  </div>
);