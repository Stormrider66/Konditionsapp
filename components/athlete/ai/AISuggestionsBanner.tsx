'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Lightbulb, X, ChevronRight, AlertTriangle, Heart, Moon, Trophy, Activity } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Suggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  action: { label: string; href: string } | null
}

export function AISuggestionsBanner() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/athlete/ai-suggestions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuggestions(data.suggestions || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Get dismissed from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem('dismissedSuggestions')
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save dismissed to session storage
  function handleDismiss(type: string) {
    const newDismissed = new Set([...dismissed, type])
    setDismissed(newDismissed)
    sessionStorage.setItem('dismissedSuggestions', JSON.stringify([...newDismissed]))
  }

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions
    .filter((s) => !dismissed.has(s.type))
    .sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 }
      return priority[b.priority] - priority[a.priority]
    })
    .slice(0, 3) // Show max 3

  if (loading || visibleSuggestions.length === 0) {
    return null
  }

  const priorityStyles: Record<string, string> = {
    high: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    medium: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    low: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  }

  const typeIcons: Record<string, typeof Lightbulb> = {
    readiness: AlertTriangle,
    injury: Heart,
    recovery: Moon,
    motivation: Trophy,
    'check-in': Activity,
    'workout-adjustment': AlertTriangle,
    preparation: Lightbulb,
  }

  return (
    <div className="space-y-3 mb-6">
      {visibleSuggestions.map((suggestion) => {
        const Icon = typeIcons[suggestion.type] || Lightbulb

        return (
          <Alert
            key={suggestion.type}
            className={cn('relative pr-12', priorityStyles[suggestion.priority])}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle className="font-medium">{suggestion.title}</AlertTitle>
            <AlertDescription className="mt-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm">{suggestion.message}</span>
                {suggestion.action && (
                  <Link href={suggestion.action.href} className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 bg-white/50 hover:bg-white/80"
                    >
                      {suggestion.action.label}
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
              onClick={() => handleDismiss(suggestion.type)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )
      })}
    </div>
  )
}
