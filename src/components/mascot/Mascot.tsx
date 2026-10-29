'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type MascotMood = 'waving' | 'celebrating' | 'studying' | 'icon';

interface MascotProps {
  mood?: MascotMood;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  useGif?: boolean;
  bubble?: string;
  bubblePosition?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  interactive?: boolean;
  animated?: boolean;
  onClick?: () => void;
  alt?: string;
}

const SIZE_MAP: Record<string, { sizeClass: string; pixelSize: number }> = {
  xs: { sizeClass: 'w-6 h-6', pixelSize: 24 },
  sm: { sizeClass: 'w-9 h-9', pixelSize: 36 },
  md: { sizeClass: 'w-14 h-14', pixelSize: 56 },
  lg: { sizeClass: 'w-24 h-24', pixelSize: 96 },
  xl: { sizeClass: 'w-36 h-36', pixelSize: 144 },
  '2xl': { sizeClass: 'w-48 h-48', pixelSize: 192 },
};

const ASSET_MAP: Record<MascotMood, { png: string; gif: string; label: string }> = {
  waving: {
    png: '/mascot/memori-waving.png',
    gif: '/mascot/memori-waving.gif',
    label: 'Memo waving hello',
  },
  celebrating: {
    png: '/mascot/memori-celebrating.png',
    gif: '/mascot/memori-celebrating.gif',
    label: 'Memo celebrating with trophy',
  },
  studying: {
    png: '/mascot/memori-studying.png',
    gif: '/mascot/memori-studying.gif',
    label: 'Memo studying vocabulary',
  },
  icon: {
    png: '/mascot/memori-icon.png',
    gif: '/mascot/memori-icon.png',
    label: 'Memo Memorize app icon',
  },
};

export const Mascot: React.FC<MascotProps> = ({
  mood = 'waving',
  size = 'md',
  useGif = false,
  bubble,
  bubblePosition = 'top',
  className = '',
  interactive = true,
  animated = true,
  onClick,
  alt,
}) => {
  const asset = ASSET_MAP[mood] || ASSET_MAP.waving;
  const imageSrc = useGif ? asset.gif : asset.png;

  const sizeInfo = typeof size === 'number'
    ? { sizeClass: '', pixelSize: size }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const style = typeof size === 'number'
    ? { width: `${size}px`, height: `${size}px` }
    : undefined;

  // Custom mood animations using Framer Motion (buttery smooth 60fps & 100% transparent PNG)
  const getAnimation = () => {
    if (!animated) return {};
    switch (mood) {
      case 'celebrating':
        return {
          y: [0, -10, 0, -4, 0],
          rotate: [0, -4, 4, 0],
          scale: [1, 1.05, 1],
          transition: {
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
      case 'waving':
        return {
          y: [0, -5, 0],
          rotate: [-3, 4, -3],
          transition: {
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
      case 'studying':
        return {
          y: [0, -4, 0],
          scale: [1, 1.025, 1],
          transition: {
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
      case 'icon':
      default:
        return {
          y: [0, -3, 0],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      onClick={onClick}
    >
      {/* Speech bubble */}
      {bubble && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`absolute z-20 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-clay-md border-2 border-blue-200 dark:border-slate-700 whitespace-nowrap pointer-events-none flex items-center gap-1 ${
            bubblePosition === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : bubblePosition === 'right'
              ? 'left-full ml-2 top-1/2 -translate-y-1/2'
              : bubblePosition === 'bottom'
              ? 'top-full mt-2 left-1/2 -translate-x-1/2'
              : 'right-full mr-2 top-1/2 -translate-y-1/2'
          }`}
        >
          <span>{bubble}</span>
        </motion.div>
      )}

      {/* Mascot Image with Framer Motion spring interaction */}
      <motion.div
        animate={getAnimation()}
        whileHover={interactive ? { scale: 1.1, rotate: [0, -3, 3, 0] } : undefined}
        whileTap={interactive ? { scale: 0.92 } : undefined}
        className={`relative flex items-center justify-center ${sizeInfo.sizeClass} ${interactive ? 'cursor-pointer' : ''}`}
        style={style}
      >
        <img
          src={imageSrc}
          alt={alt || asset.label}
          className="w-full h-full object-contain filter drop-shadow-clay-sm transition-all duration-200"
          draggable={false}
          loading="eager"
        />
      </motion.div>
    </div>
  );
};
