'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type PageContext } from './FloatingAIChat'

interface PageContextValue {
  pageContext: PageContext | undefined
  setPageContext: (context: PageContext | undefined) => void
  updatePageContext: (partial: Partial<PageContext>) => void
  clearPageContext: () => void
}

const PageContextContext = createContext<PageContextValue | undefined>(undefined)

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContextState] = useState<PageContext | undefined>()

  const setPageContext = useCallback((context: PageContext | undefined) => {
    setPageContextState(context)
  }, [])

  const updatePageContext = useCallback((partial: Partial<PageContext>) => {
    setPageContextState((prev) => {
      if (!prev) return prev
      return { ...prev, ...partial }
    })
  }, [])

  const clearPageContext = useCallback(() => {
    setPageContextState(undefined)
  }, [])

  return (
    <PageContextContext.Provider
      value={{
        pageContext,
        setPageContext,
        updatePageContext,
        clearPageContext,
      }}
    >
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
