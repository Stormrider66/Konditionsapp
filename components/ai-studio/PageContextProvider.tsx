'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { type PageContext } from './FloatingAIChat'
import { resolvePageContext } from '@/lib/page-context-registry'
import { useVisibleCards } from '@/hooks/use-visible-cards'

interface PageContextValue {
  pageContext: PageContext | undefined
  setPageContext: (context: PageContext | undefined) => void
  updatePageContext: (partial: Partial<PageContext>) => void
  clearPageContext: () => void
  /** Concept keys from cards currently visible in the viewport */
  visibleConcepts: Set<string>
}

const PageContextContext = createContext<PageContextValue | undefined>(undefined)

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContextState] = useState<PageContext | undefined>()
  const isManuallySet = useRef(false)
  const pathname = usePathname()
  const visibleConcepts = useVisibleCards()

  // Auto-resolve page context from pathname on navigation
  useEffect(() => {
    const config = resolvePageContext(pathname)
    if (config) {
      // Only override if context was not manually set (e.g. video analysis with rich data)
      if (!isManuallySet.current) {
        setPageContextState({
          type: 'auto',
          title: config.pageTitle,
          data: {},
          summary: config.description,
          conceptKeys: config.concepts,
        })
      }
    } else {
      // Unknown route - clear auto context
      if (!isManuallySet.current) {
        setPageContextState(undefined)
      }
    }
    // Reset manual flag on navigation
    isManuallySet.current = false
  }, [pathname])

  const setPageContext = useCallback((context: PageContext | undefined) => {
    isManuallySet.current = !!context
    setPageContextState(context)
  }, [])

  const updatePageContext = useCallback((partial: Partial<PageContext>) => {
    isManuallySet.current = true
    setPageContextState((prev) => {
      if (!prev) return prev
      return { ...prev, ...partial }
    })
  }, [])

  const clearPageContext = useCallback(() => {
    isManuallySet.current = false
    setPageContextState(undefined)
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    pageContext,
    setPageContext,
    updatePageContext,
    clearPageContext,
    visibleConcepts,
  }), [pageContext, setPageContext, updatePageContext, clearPageContext, visibleConcepts])

  return (
    <PageContextContext.Provider value={value}>
      {children}
    </PageContextContext.Provider>
  )
}

export function usePageContext() {
  const context = useContext(PageContextContext)
  if (!context) {
    throw new Error('usePageContext must be used within a PageContextProvider')
  }
  return context
}

// Optional hook that doesn't throw - useful for components that may not be inside the provider
export function usePageContextOptional() {
  return useContext(PageContextContext)
}
