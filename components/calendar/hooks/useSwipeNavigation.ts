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
  /**
   * Callback ref to attach to the swipeable element. Using a callback ref
   * (rather than an object ref) means listeners are (re)attached whenever the
   * element mounts — important because the month grid unmounts when the user
   * switches to the agenda view and remounts on return.
   */
  ref: (node: HTMLDivElement | null) => void
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

/**
 * Movement (px) before we decide whether a gesture is a horizontal swipe or a
 * vertical scroll/tap. Below this slop, the gesture is treated as a potential
 * tap and we never touch preventDefault, so the synthesized click always fires.
 */
const DIRECTION_SLOP = 12

export function useSwipeNavigation(
  options: SwipeNavigationOptions = {}
): UseSwipeNavigationReturn {
  const { threshold, maxSwipeTime, preventScrollOnSwipe, enabled } = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

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

  // Per-gesture bookkeeping lives in a ref so the touch handlers never depend
  // on React state. This keeps their identity stable, so the listeners are
  // attached exactly once (not re-added mid-gesture, which used to drop taps).
  const gesture = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    // 'pending' until we've moved past the slop; then 'horizontal' (swipe) or
    // 'scroll' (vertical / let the browser handle it). A gesture that never
    // leaves 'pending' is a tap — we never preventDefault it.
    axis: 'pending' as 'pending' | 'horizontal' | 'scroll',
    tracking: false,
  })

  // Keep the latest options/callbacks in a ref so stable handlers can read them
  // without being recreated on every render. Synced in an effect (not during
  // render) so the listeners can be attached exactly once.
  const optionsRef = useRef({
    threshold,
    maxSwipeTime,
    preventScrollOnSwipe,
    enabled,
    onSwipeLeft: options.onSwipeLeft,
    onSwipeRight: options.onSwipeRight,
    onSwipeUp: options.onSwipeUp,
    onSwipeDown: options.onSwipeDown,
  })
  useEffect(() => {
    optionsRef.current = {
      threshold,
      maxSwipeTime,
      preventScrollOnSwipe,
      enabled,
      onSwipeLeft: options.onSwipeLeft,
      onSwipeRight: options.onSwipeRight,
      onSwipeUp: options.onSwipeUp,
      onSwipeDown: options.onSwipeDown,
    }
  })

  const resetGesture = useCallback(() => {
    gesture.current.tracking = false
    gesture.current.axis = 'pending'
    setSwipeOffset(0)
    setSwipeState((prev) => (prev.isSwiping ? { ...prev, isSwiping: false, direction: null } : prev))
  }, [])

  // Stable touch handlers — they read live values from refs, so they never need
  // to be recreated. This is the core fix for "some days aren't tappable": we
  // only preventDefault after a gesture has committed to a horizontal swipe, so
  // taps and vertical scrolls keep their native click behaviour.
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!optionsRef.current.enabled) return
    const touch = e.touches[0]
    gesture.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      axis: 'pending',
      tracking: true,
    }
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    const g = gesture.current
    if (!optionsRef.current.enabled || !g.tracking) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - g.startX
    const deltaY = touch.clientY - g.startY

    // Decide the axis once, after we've moved past the slop threshold. We only
    // record the axis in the ref — we deliberately do NOT setState or animate a
    // translateX offset mid-gesture. Animating shifted the grid horizontally
    // under the finger, so a tap that drifted sideways landed on a different
    // cell (or none) when released — the "some days aren't clickable" bug.
    // Swipes are detected purely from the start→end delta on touchend, and the
    // element's `touch-action: pan-y` keeps vertical scrolling native.
    if (g.axis === 'pending') {
      if (Math.abs(deltaX) < DIRECTION_SLOP && Math.abs(deltaY) < DIRECTION_SLOP) {
        return
      }
      g.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'scroll'
    }
  }, [])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const g = gesture.current
    if (!optionsRef.current.enabled || !g.tracking) {
      resetGesture()
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch ? touch.clientX - g.startX : 0
    const swipeTime = Date.now() - g.startTime
    const opts = optionsRef.current

    if (
      g.axis === 'horizontal' &&
      swipeTime <= opts.maxSwipeTime &&
      Math.abs(deltaX) >= opts.threshold
    ) {
      if (deltaX < 0) opts.onSwipeLeft?.()
      else opts.onSwipeRight?.()
    }

    resetGesture()
  }, [resetGesture])

  // Track the element listeners are currently bound to, so a callback ref can
  // move them when the swipeable element mounts/unmounts (e.g. month ⇄ agenda).
  const boundEl = useRef<HTMLDivElement | null>(null)

  const ref = useCallback((node: HTMLDivElement | null) => {
    const prev = boundEl.current
    if (prev) {
      prev.removeEventListener('touchstart', onTouchStart)
      prev.removeEventListener('touchmove', onTouchMove)
      prev.removeEventListener('touchend', onTouchEnd)
      prev.removeEventListener('touchcancel', resetGesture)
    }
    boundEl.current = node
    if (node) {
      // All passive: we never preventDefault. Horizontal-vs-vertical intent is
      // handled by `touch-action: pan-y` on the element + swipe detection here.
      node.addEventListener('touchstart', onTouchStart, { passive: true })
      node.addEventListener('touchmove', onTouchMove, { passive: true })
      node.addEventListener('touchend', onTouchEnd, { passive: true })
      node.addEventListener('touchcancel', resetGesture, { passive: true })
    }
  }, [onTouchStart, onTouchMove, onTouchEnd, resetGesture])

  return {
    ref,
    swipeState,
    isSwiping: swipeState.isSwiping,
    swipeOffset,
  }
}

/**
 * Hook to detect if the device is touch-capable
 * Returns false during SSR and initial hydration to prevent hydration mismatch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
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

  // Return false until mounted to ensure SSR/client consistency
  if (!hasMounted) return false
  return isTouch
}

/**
 * Hook to detect mobile viewport
 * Returns false during SSR and initial hydration to prevent hydration mismatch
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  // Return false until mounted to ensure SSR/client consistency
  if (!hasMounted) return false
  return isMobile
}
