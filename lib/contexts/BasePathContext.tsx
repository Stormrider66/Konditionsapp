'use client'

import { createContext, useContext, ReactNode } from 'react'

const BasePathContext = createContext<string>('')

interface BasePathProviderProps {
  basePath: string
  children: ReactNode
}

export function BasePathProvider({ basePath, children }: BasePathProviderProps) {
  return <BasePathContext.Provider value={basePath}>{children}</BasePathContext.Provider>
}

export function useBasePath(): string {
  return useContext(BasePathContext)
}
