'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * Hook that tracks which cards with `data-concept` attributes are visible in the viewport.
 * Returns a Set of concept keys that are currently visible.
 *
 * Usage:
 * 1. Add `data-concept="acwr"` attribute to card elements
 * 2. Call `useVisibleCards()` to get the set of visible concept keys
 * 3. Feed visible keys to PageContextProvider for dynamic AI context
 *
 * Example:
 * ```tsx
 * <GlassCard data-concept="acwr">...</GlassCard>
 * <GlassCard data-concept="readiness">...</GlassCard>
 *
 * const visibleConcepts = useVisibleCards()
 * // visibleConcepts = Set { 'acwr', 'readiness' } when both are on screen
 * ```
 */
export function useVisibleCards(): Set<string> {
  const [visibleConcepts, setVisibleConcepts] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const trackedElements = useRef<Set<Element>>(new Set())

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    setVisibleConcepts((prev) => {
      const next = new Set(prev)
      let changed = false

      for (const entry of entries) {
        const concept = (entry.target as HTMLElement).dataset.concept
        if (!concept) continue

        if (entry.isIntersecting && !prev.has(concept)) {
          next.add(concept)
          changed = true
        } else if (!entry.isIntersecting && prev.has(concept)) {
          next.delete(concept)
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [])

  useEffect(() => {
    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.1, // 10% visible = counted
    })

    // Find and observe all elements with data-concept
    const elements = document.querySelectorAll('[data-concept]')
    elements.forEach((el) => {
      observerRef.current?.observe(el)
      trackedElements.current.add(el)
    })

    // MutationObserver to catch dynamically added cards
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check the node itself
            if (node.dataset.concept && !trackedElements.current.has(node)) {
              observerRef.current?.observe(node)
              trackedElements.current.add(node)
            }
            // Check children
            const children = node.querySelectorAll('[data-concept]')
            children.forEach((child) => {
              if (!trackedElements.current.has(child)) {
                observerRef.current?.observe(child)
                trackedElements.current.add(child)
              }
            })
          }
        })
      }
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observerRef.current?.disconnect()
      mutationObserver.disconnect()
      trackedElements.current.clear()
    }
  }, [handleIntersection])

  return visibleConcepts
}
