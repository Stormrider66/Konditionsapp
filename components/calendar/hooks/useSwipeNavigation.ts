/**
 * Swipe Navigation Hook
 *
 * Enables swipe gestures for navigating between weeks/months on mobile devices.
 * Uses touch events for smooth, native-feeling navigation.
 */

import { useRef, useCallback, useEffect, useState } from 'react'

interface SwipeNavigationOptions {
  /** Minimum distance (px) to trigger a swipe */
  threshold?: number
  /** Maximum time (ms) for a swipe gesture */
  maxSwipeTime?: number
  /** Called when swiping left (next) */
  onSwipeLeft?: () => void
  /** Called when swiping right (previous) */
  onSwipeRight?: () => void
  /** Called when swiping up */
  onSwipeUp?: () => void
  /** Called when swiping down */
  onSwipeDown?: () => void
  /** Whether to prevent vertical scrolling during horizontal swipe */
  preventScrollOnSwipe?: boolean
  /** Whether swipe is enabled */
  enabled?: boolean
}

interface SwipeState {
  startX: number
  startY: number
  startTime: number
  deltaX: number
  deltaY: number
  isSwiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}

interface UseSwipeNavigationReturn {
  /** Ref to attach to the swipeable element */
  ref: React.RefObject<HTMLDivElement>
  /** Current swipe state */
  swipeState: SwipeState
  /** Whether a swipe is in progress */
  isSwiping: boolean
  /** Current horizontal offset during swipe (for animations) */
  swipeOffset: number
}

const DEFAULT_OPTIONS: Required<SwipeNavigationOptions> = {
  threshold: 50,
  maxSwipeTime: 500,
  onSwipeLeft: () => {},
  onSwipeRight: () => {},
  onSwipeUp: () => {},
  onSwipeDown: () => {},
  preventScrollOnSwipe: true,
  enabled: true,
}

export function useSwipeNavigation(
  options: SwipeNavigationOptions = {}
): UseSwipeNavigationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const {
    threshold,
    maxSwipeTime,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventScrollOnSwipe,
    enabled,
  } = mergedOptions

  const ref = useRef<HTMLDivElement>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
    direction: null,
  })

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return

      const touch = e.touches[0]
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        deltaX: 0,
        deltaY: 0,
        isSwiping: true,
        direction: null,
      })
      setSwipeOffset(0)
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !swipeState.isSwiping) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - swipeState.startX
      const deltaY = touch.clientY - swipeState.startY

      // Determine direction (prioritize horizontal)
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)

      if (isHorizontal && preventScrollOnSwipe && Math.abs(deltaX) > 10) {
        e.preventDefault()
      }

      let direction: 'left' | 'right' | 'up' | 'down' | null = null
      if (isHorizontal) {
        direction = deltaX < 0 ? 'left' : 'right'
      } else {
        direction = deltaY < 0 ? 'up' : 'down'
      }

      setSwipeState((prev) => ({
        ...prev,
        deltaX,
        deltaY,
        direction,
      }))

      // Set offset for visual feedback (limit to reasonable range)
      if (isHorizontal) {
        const maxOffset = 100
        const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5))
        setSwipeOffset(offset)
      }
    },
    [enabled, swipeState.isSwiping, swipeState.startX, swipeState.startY, preventScrollOnSwipe]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swipeState.isSwiping) return

    const { deltaX, deltaY, startTime, direction } = swipeState
    const swipeTime = Date.now() - startTime

    // Reset offset with animation
    setSwipeOffset(0)

    // Check if swipe meets criteria
    const isValidSwipe =
      swipeTime <= maxSwipeTime &&
      (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold)

    if (isValidSwipe && direction) {
      switch (direction) {
        case 'left':
          onSwipeLeft()
          break
        case 'right':
          onSwipeRight()
          break
        case 'up':
          onSwipeUp()
          break
        case 'down':
          onSwipeDown()
          break
      }
    }

    setSwipeState({
      startX: 0,
      startY: 0,
      startTime: 0,
      deltaX: 0,
      deltaY: 0,
      isSwiping: false,
      direction: null,
    })
  }, [
    enabled,
    swipeState,
    threshold,
    maxSwipeTime,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ])

  const handleTouchCancel = useCallback(() => {
    setSwipeOffset(0)
    setSwipeState({
      startX: 0,
      startY: 0,
      startTime: 0,
      deltaX: 0,
      deltaY: 0,
      isSwiping: false,
      direction: null,
    })
  }, [])

  // Attach event listeners
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel])

  return {
    ref,
    swipeState,
    isSwiping: swipeState.isSwiping,
    swipeOffset,
  }
}

/**
 * Hook to detect if the device is touch-capable
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-expect-error - msMaxTouchPoints is IE-specific
          navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()

    // Also check on first touch
    const handleTouch = () => {
      setIsTouch(true)
      window.removeEventListener('touchstart', handleTouch)
    }

    window.addEventListener('touchstart', handleTouch, { once: true })

    return () => {
      window.removeEventListener('touchstart', handleTouch)
    }
  }, [])

  return isTouch
}

/**
 * Hook to detect mobile viewport
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
}
