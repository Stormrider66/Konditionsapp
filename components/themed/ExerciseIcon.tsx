'use client';

/**
 * ExerciseIcon Component
 *
 * Renders an exercise icon with theme support:
 * - Uses exercise-specific iconUrl if available
 * - Falls back to category icon based on iconCategory
 * - Supports size variants (sm, md, lg, xl)
 * - Integrates with workout theme system
 */

import Image from 'next/image';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

// Icon category mapping to fallback icons
const CATEGORY_ICONS: Record<string, string> = {
  strength: '/icons/exercises/strength.svg',
  cardio: '/icons/exercises/cardio.svg',
  core: '/icons/exercises/core.svg',
  plyometric: '/icons/exercises/plyometric.svg',
  olympic: '/icons/exercises/olympic.svg',
  gymnastics: '/icons/exercises/gymnastics.svg',
  running: '/icons/exercises/running.svg',
  default: '/icons/exercises/default.svg',
};

// Size variants in pixels
const SIZE_VARIANTS = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

type SizeVariant = keyof typeof SIZE_VARIANTS;

interface ExerciseIconProps {
  /** Direct URL to exercise icon */
  iconUrl?: string | null;
  /** Category for fallback icon */
  iconCategory?: string | null;
  /** Alternative: derive category from workout type */
  workoutType?: 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'CARDIO' | string;
  /** Alternative: derive category from movement category */
  movementCategory?: string | null;
  /** Size variant */
  size?: SizeVariant;
  /** Custom className */
  className?: string;
  /** Alt text */
  alt?: string;
  /** Whether to apply theme colors (uses CSS filter for SVGs) */
  themed?: boolean;
}

/**
 * Map workout type to icon category
 */
function workoutTypeToCategory(type?: string): string {
  if (!type) return 'default';

  const mapping: Record<string, string> = {
    STRENGTH: 'strength',
    PLYOMETRIC: 'plyometric',
    CORE: 'core',
    CARDIO: 'cardio',
    RUNNING: 'running',
  };

  return mapping[type.toUpperCase()] || 'default';
}

/**
 * Map movement category to icon category
 */
function movementCategoryToIcon(category?: string | null): string {
  if (!category) return 'default';

  const mapping: Record<string, string> = {
    OLYMPIC_LIFT: 'olympic',
    POWERLIFTING: 'strength',
    GYMNASTICS: 'gymnastics',
    BODYWEIGHT: 'gymnastics',
    CARDIO_MACHINE: 'cardio',
    RUNNING: 'running',
    KETTLEBELL: 'strength',
    DUMBBELL: 'strength',
    CORE: 'core',
    PLYOMETRIC: 'plyometric',
  };

  return mapping[category.toUpperCase()] || 'default';
}

export function ExerciseIcon({
  iconUrl,
  iconCategory,
  workoutType,
  movementCategory,
  size = 'md',
  className = '',
  alt = 'Exercise icon',
  themed = true,
}: ExerciseIconProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  // Determine the icon URL to use
  let finalIconUrl: string;

  if (iconUrl) {
    // Use specific exercise icon if available
    finalIconUrl = iconUrl;
  } else {
    // Determine category from various sources
    const category =
      iconCategory?.toLowerCase() ||
      (movementCategory ? movementCategoryToIcon(movementCategory) : null) ||
      workoutTypeToCategory(workoutType) ||
      'default';

    finalIconUrl = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
  }

  const sizeInPx = SIZE_VARIANTS[size];

  // For dark theme, we need to invert the SVG colors
  // The SVGs use currentColor with stroke, so we use CSS filter
  const isDarkTheme = theme.id === 'FITAPP_DARK';

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: sizeInPx,
        height: sizeInPx,
      }}
    >
      <Image
        src={finalIconUrl}
        alt={alt}
        width={sizeInPx}
        height={sizeInPx}
        className="object-contain"
        style={{
          // Apply theme-based filter for SVG icons
          // Invert for dark theme to make black strokes white
          filter: themed && isDarkTheme ? 'invert(1)' : 'none',
        }}
      />
    </div>
  );
}

/**
 * Hook to get icon URL for an exercise
 * Useful when you need the URL without rendering the component
 */
export function useExerciseIconUrl(options: {
  iconUrl?: string | null;
  iconCategory?: string | null;
  workoutType?: string;
  movementCategory?: string | null;
}): string {
  const { iconUrl, iconCategory, workoutType, movementCategory } = options;

  if (iconUrl) return iconUrl;

  const category =
    iconCategory?.toLowerCase() ||
    (movementCategory ? movementCategoryToIcon(movementCategory) : null) ||
    workoutTypeToCategory(workoutType) ||
    'default';

  return CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
}

export { CATEGORY_ICONS, SIZE_VARIANTS };
export type { SizeVariant };
