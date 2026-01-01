'use client';

/**
 * ExerciseHeader Component
 *
 * A styled header for exercise display that matches the AI-generated image aesthetic:
 * - Dark gradient background
 * - Orange/red glow effect on text
 * - Displays Swedish name (primary) + English name (secondary)
 * - Matches the 9:16 vertical image width
 */

import { cn } from '@/lib/utils';

interface ExerciseHeaderProps {
  /** Primary name (usually Swedish) */
  nameSv?: string | null;
  /** Secondary name (usually English) */
  nameEn?: string | null;
  /** Fallback name if neither is provided */
  name: string;
  /** Size variant to match ExerciseImage width */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Custom className */
  className?: string;
  /** Show subtitle/secondary name */
  showSubtitle?: boolean;
}

// Width variants matching ExerciseImage
const WIDTH_VARIANTS = {
  sm: 90,
  md: 180,
  lg: 270,
  xl: 360,
  full: 832,
} as const;

export function ExerciseHeader({
  nameSv,
  nameEn,
  name,
  size = 'lg',
  className = '',
  showSubtitle = true,
}: ExerciseHeaderProps) {
  // Determine primary and secondary names
  const primaryName = nameSv || name;
  const secondaryName = nameSv && nameEn && nameEn !== nameSv ? nameEn : null;

  const width = WIDTH_VARIANTS[size];

  // Font sizes based on variant
  const fontSizes = {
    sm: { primary: 'text-xs', secondary: 'text-[10px]' },
    md: { primary: 'text-sm', secondary: 'text-xs' },
    lg: { primary: 'text-lg', secondary: 'text-sm' },
    xl: { primary: 'text-xl', secondary: 'text-base' },
    full: { primary: 'text-2xl', secondary: 'text-lg' },
  };

  const { primary: primarySize, secondary: secondarySize } = fontSizes[size];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-lg',
        className
      )}
      style={{ width }}
    >
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />

      {/* Subtle glow effect layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/5 to-orange-600/10" />

      {/* Top edge glow line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      {/* Content */}
      <div className="relative px-3 py-2.5 text-center">
        {/* Primary Name with glow */}
        <h3
          className={cn(
            'font-bold uppercase tracking-wider text-white',
            primarySize
          )}
          style={{
            textShadow: '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)'
          }}
        >
          {primaryName}
        </h3>

        {/* Secondary Name (English) */}
        {showSubtitle && secondaryName && (
          <p
            className={cn(
              'mt-0.5 uppercase tracking-wide text-orange-200/70',
              secondarySize
            )}
          >
            {secondaryName}
          </p>
        )}
      </div>

      {/* Bottom edge subtle glow */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
    </div>
  );
}

/**
 * Combined Exercise Header + Image component for convenience
 * Stacks the header on top of the image seamlessly
 */
interface ExerciseDisplayProps extends ExerciseHeaderProps {
  /** Array of storage paths for images */
  imageUrls?: string[] | null;
  /** Exercise ID for fallback */
  exerciseId?: string;
  /** Category for fallback icon */
  iconCategory?: string | null;
  /** Enable carousel for multiple images */
  showCarousel?: boolean;
  /** Enable full-screen lightbox on tap */
  enableLightbox?: boolean;
}

export function ExerciseDisplay({
  nameSv,
  nameEn,
  name,
  imageUrls,
  exerciseId,
  iconCategory,
  size = 'lg',
  className = '',
  showSubtitle = true,
  showCarousel = true,
  enableLightbox = true,
}: ExerciseDisplayProps) {
  // We need to dynamically import ExerciseImage to avoid circular dependency
  // This is a combined component that puts header + image together
  const hasImages = imageUrls && imageUrls.length > 0;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header - always show */}
      <ExerciseHeader
        nameSv={nameSv}
        nameEn={nameEn}
        name={name}
        size={size}
        showSubtitle={showSubtitle}
        className={hasImages ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'}
      />

      {/* Image will be added by parent component to avoid circular imports */}
    </div>
  );
}
