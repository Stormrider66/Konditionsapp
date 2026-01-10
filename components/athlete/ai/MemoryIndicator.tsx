'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Brain, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Memory {
  id: string
  memoryType: string
  content: string
  context: string | null
  importance: number
  extractedAt: string
}

interface MemoryIndicatorProps {
  clientId: string
  onMemoryContextReady?: (context: { memoryContent: string; summaryContent?: string }) => void
}

// Memory type labels (Swedish)
const MEMORY_TYPE_LABELS: Record<string, string> = {
  INJURY_MENTION: 'Skada',
  GOAL_STATEMENT: 'Mål',
  PREFERENCE: 'Preferens',
  LIFE_EVENT: 'Livshändelse',
  FEEDBACK: 'Feedback',
  MILESTONE: 'Milstolpe',
  EQUIPMENT: 'Utrustning',
  LIMITATION: 'Begränsning',
  PERSONAL_FACT: 'Personligt',
}

// Memory type colors
const MEMORY_TYPE_COLORS: Record<string, string> = {
  INJURY_MENTION: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  GOAL_STATEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PREFERENCE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  LIFE_EVENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FEEDBACK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  MILESTONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  EQUIPMENT: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  LIMITATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PERSONAL_FACT: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
}

export function MemoryIndicator({ clientId, onMemoryContextReady }: MemoryIndicatorProps) {
  const { toast } = useToast()
  const [memories, setMemories] = useState<Memory[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Fetch memories on mount
  useEffect(() => {
    async function fetchMemories() {
      try {
        const response = await fetch(`/api/ai/memory/${clientId}?format=json&limit=20`)
        if (!response.ok) {
          throw new Error('Failed to fetch memories')
        }
        const data = await response.json()
        setMemories(data.memories || [])
        setSummary(data.summary?.summary || null)

        // Also fetch formatted version for prompt
        if (onMemoryContextReady) {
          const promptResponse = await fetch(`/api/ai/memory/${clientId}?format=prompt&limit=10`)
          if (promptResponse.ok) {
            const promptData = await promptResponse.json()
            onMemoryContextReady({
              memoryContent: promptData.memoryContext || '',
              summaryContent: promptData.summary || undefined,
            })
          }
        }
      } catch (error) {
        console.error('Error fetching memories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMemories()
  }, [clientId, onMemoryContextReady])

  async function handleDeleteMemory(memoryId: string) {
    setIsDeleting(memoryId)
    try {
      const response = await fetch(`/api/ai/memory/${clientId}?memoryId=${memoryId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete memory')
      }
      setMemories((prev) => prev.filter((m) => m.id !== memoryId))
      toast({
        title: 'Minne borttaget',
        description: 'Minnet har tagits bort.',
      })
    } catch (error) {
      console.error('Error deleting memory:', error)
      toast({
        title: 'Kunde inte ta bort minnet',
        description: 'Försök igen senare.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Don't render if loading or no memories
  if (isLoading) {
    return null
  }

  if (memories.length === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 relative text-white hover:bg-white/20',
            'after:absolute after:top-1 after:right-1 after:h-2 after:w-2',
            'after:rounded-full after:bg-amber-400 after:animate-pulse'
          )}
          title={`${memories.length} minnen lagrade`}
        >
          <Brain className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm">AI-minnen</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {memories.length} st
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Saker jag kommer ihåg om dig
          </p>
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-2">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] mb-1', MEMORY_TYPE_COLORS[memory.memoryType])}
                    >
                      {MEMORY_TYPE_LABELS[memory.memoryType] || memory.memoryType}
                    </Badge>
                    <p className="text-sm leading-snug">{memory.content}</p>
                    {memory.context && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {memory.context}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteMemory(memory.id)}
                    disabled={isDeleting === memory.id}
                  >
                    {isDeleting === memory.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 w-3 rounded-sm mr-0.5',
                          i < memory.importance
                            ? 'bg-amber-400'
                            : 'bg-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(memory.extractedAt).toLocaleDateString('sv-SE')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {summary && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs font-medium mb-1">Veckans sammanfattning</p>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
