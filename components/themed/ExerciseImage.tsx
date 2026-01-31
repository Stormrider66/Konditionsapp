'use client';

/**
 * ExerciseImage Component
 *
 * Displays exercise images with the following features:
 * - Carousel/swipe for multiple images (mobile-friendly)
 * - Fallback to ExerciseIcon if no images available
 * - Size variants optimized for 9:16 vertical aspect ratio
 * - Lazy loading via Next.js Image
 * - Optional full-screen lightbox
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExerciseIcon } from './ExerciseIcon';
import { getExerciseImagePublicUrl, isHttpUrl } from '@/lib/storage/supabase-storage';
import { cn } from '@/lib/utils';

// Size variants for 9:16 aspect ratio (vertical, mobile-first)
const SIZE_VARIANTS = {
  sm: { width: 90, height: 160 },
  md: { width: 180, height: 320 },
  lg: { width: 270, height: 480 },
  xl: { width: 360, height: 640 },
  full: { width: 832, height: 1472 }, // Full resolution
} as const;

type SizeVariant = keyof typeof SIZE_VARIANTS;

interface ExerciseImageProps {
  /** Array of storage paths for images */
  imageUrls?: string[] | null;
  /** Exercise ID for fallback purposes */
  exerciseId?: string;
  /** Category for fallback icon */
  iconCategory?: string | null;
  /** Size variant */
  size?: SizeVariant;
  /** Enable carousel for multiple images */
  showCarousel?: boolean;
  /** Enable full-screen lightbox on tap */
  enableLightbox?: boolean;
  /** Custom className */
  className?: string;
  /** Alt text */
  alt?: string;
  /** Priority loading (for above-the-fold images) */
  priority?: boolean;
}

export function ExerciseImage({
  imageUrls,
  exerciseId,
  iconCategory,
  size = 'lg',
  showCarousel = true,
  enableLightbox = true,
  className = '',
  alt = 'Exercise demonstration',
  priority = false,
}: ExerciseImageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve paths to full URLs
  // - If path starts with /images/ -> local static file, use directly
  // - If path is already a full URL -> use directly
  // - Otherwise -> Supabase storage path, construct full URL
  const resolvedUrls = imageUrls?.filter(Boolean).map(path => {
    if (path.startsWith('/images/') || path.startsWith('/images\\')) {
      // Local static file in public/images/
      return path;
    }
    if (isHttpUrl(path)) {
      // Already a full URL
      return path;
    }
    // Supabase storage path
    return getExerciseImagePublicUrl(path);
  }) || [];
  const hasImages = resolvedUrls.length > 0;
  const hasMultipleImages = resolvedUrls.length > 1;

  // Check if className contains width/height classes (should fill parent instead of fixed size)
  const shouldFillContainer = className.includes('w-full') || className.includes('h-full');

  // Minimum swipe distance to trigger navigation
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, [hasMultipleImages]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchEnd(e.targetTouches[0].clientX);
  }, [hasMultipleImages]);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || !hasMultipleImages) return;

    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (distance > 0) {
        // Swipe left - next image
        setCurrentIndex(prev => (prev + 1) % resolvedUrls.length);
      } else {
        // Swipe right - previous image
        setCurrentIndex(prev => (prev - 1 + resolvedUrls.length) % resolvedUrls.length);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, hasMultipleImages, resolvedUrls.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % resolvedUrls.length);
  }, [resolvedUrls.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + resolvedUrls.length) % resolvedUrls.length);
  }, [resolvedUrls.length]);

  const openLightbox = useCallback(() => {
    if (enableLightbox && hasImages) {
      setIsLightboxOpen(true);
    }
  }, [enableLightbox, hasImages]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, closeLightbox, goToNext, goToPrevious]);

  const dimensions = SIZE_VARIANTS[size];

  // Fallback to ExerciseIcon if no images
  if (!hasImages) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted/30 rounded-lg',
          className
        )}
        style={shouldFillContainer ? undefined : {
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: '9/16'
        }}
      >
        <ExerciseIcon
          iconCategory={iconCategory}
          size="xl"
          className="opacity-50"
          alt={alt}
        />
      </div>
    );
  }

  return (
    <>
      {/* Main Image Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-lg bg-black/90',
          enableLightbox && 'cursor-pointer',
          className
        )}
        style={shouldFillContainer ? undefined : {
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: '9/16'
        }}
        onClick={openLightbox}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Current Image */}
        <Image
          src={resolvedUrls[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          fill
          sizes={`${dimensions.width}px`}
          className="object-cover"
          priority={priority}
        />

        {/* Carousel Navigation Arrows (desktop) */}
        {showCarousel && hasMultipleImages && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {showCarousel && hasMultipleImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {resolvedUrls.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'bg-white scale-110'
                    : 'bg-white/50 hover:bg-white/75'
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Image Count Badge */}
        {hasMultipleImages && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
            {currentIndex + 1}/{resolvedUrls.length}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Lightbox Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            style={{ aspectRatio: '9/16' }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={resolvedUrls[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              width={SIZE_VARIANTS.full.width}
              height={SIZE_VARIANTS.full.height}
              className="object-contain max-h-[90vh] w-auto"
              priority
            />
          </div>

          {/* Lightbox Navigation */}
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </button>

              {/* Lightbox Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {resolvedUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                    className={cn(
                      'w-3 h-3 rounded-full transition-all',
                      index === currentIndex
                        ? 'bg-white scale-110'
                        : 'bg-white/40 hover:bg-white/60'
                    )}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Lightbox Count */}
          {hasMultipleImages && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium">
              {currentIndex + 1} / {resolvedUrls.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export { SIZE_VARIANTS };
export type { SizeVariant };
