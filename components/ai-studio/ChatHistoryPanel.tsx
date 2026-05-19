'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { History, Search, Trash2, User, MessageSquare, Loader2, Bot } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { AIProvider } from '@prisma/client'
import { useLocale } from '@/i18n/client'

interface Conversation {
  id: string
  title: string | null
  modelUsed: string
  provider: AIProvider
  createdAt: Date
  updatedAt: Date
  athlete?: {
    id: string
    name: string
  } | null
  _count?: {
    messages: number
  }
}

interface ChatHistoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConversationId: string | null
  onLoadConversation: (conversationId: string) => void
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const copy = {
  en: {
    fetchErrorTitle: 'Could not load history',
    fetchErrorDescription: 'Try again later',
    deletedTitle: 'Conversation deleted',
    deleteErrorTitle: 'Could not delete conversation',
    title: 'Chat history',
    searchPlaceholder: 'Search conversations...',
    noMatches: 'No matching conversations',
    noHistory: 'No chat history yet',
    newConversation: 'New conversation',
    messages: 'messages',
    deleteTitle: 'Delete conversation?',
    deleteDescription:
      'This action cannot be undone. The conversation and all of its messages will be permanently deleted.',
    cancel: 'Cancel',
    delete: 'Delete',
    groups: {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This week',
      older: 'Older',
    },
  },
  sv: {
    fetchErrorTitle: 'Kunde inte hämta historik',
    fetchErrorDescription: 'Försök igen senare',
    deletedTitle: 'Konversation borttagen',
    deleteErrorTitle: 'Kunde inte ta bort konversation',
    title: 'Chatthistorik',
    searchPlaceholder: 'Sök konversationer...',
    noMatches: 'Inga matchande konversationer',
    noHistory: 'Ingen chatthistorik ännu',
    newConversation: 'Ny konversation',
    messages: 'meddelanden',
    deleteTitle: 'Ta bort konversation?',
    deleteDescription:
      'Denna åtgärd kan inte ångras. Konversationen och alla dess meddelanden kommer att tas bort permanent.',
    cancel: 'Avbryt',
    delete: 'Ta bort',
    groups: {
      today: 'Idag',
      yesterday: 'Igår',
      thisWeek: 'Denna vecka',
      older: 'Äldre',
    },
  },
}

export function ChatHistoryPanel({
  open,
  onOpenChange,
  currentConversationId,
  onLoadConversation,
}: ChatHistoryPanelProps) {
  const { toast } = useToast()
  const appLocale = getAppLocale(useLocale())
  const ui = copy[appLocale]
  const toastRef = useRef(toast)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/conversations?limit=50')
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      toastRef.current({
        title: ui.fetchErrorTitle,
        description: ui.fetchErrorDescription,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [ui.fetchErrorDescription, ui.fetchErrorTitle])

  useEffect(() => {
    if (open) {
      void Promise.resolve().then(fetchConversations)
    }
  }, [open, fetchConversations])

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        toast({
          title: ui.deletedTitle,
        })
      } else {
        throw new Error('Failed to delete')
      }
    } catch (_err) {
      toast({
        title: ui.deleteErrorTitle,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.athlete?.name.toLowerCase().includes(query) ||
      conv.modelUsed.toLowerCase().includes(query)
    )
  })

  // Group conversations by date
  const groupedConversations = groupByDate(filteredConversations, ui.groups)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {ui.title}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={ui.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Conversations list */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {searchQuery ? ui.noMatches : ui.noHistory}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {Object.entries(groupedConversations).map(([group, convs]) => (
                    <div key={group}>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {group}
                      </h3>
                      <div className="space-y-1">
                        {convs.map((conv) => (
                          <div
                            key={conv.id}
                            className={`group relative p-3 rounded-lg hover:bg-muted/80 transition cursor-pointer ${
                              currentConversationId === conv.id ? 'bg-muted border-l-2 border-l-primary' : ''
                            }`}
                            onClick={() => {
                              onLoadConversation(conv.id)
                              onOpenChange(false)
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {conv.title || ui.newConversation}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {conv.athlete && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {conv.athlete.name}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Bot className="h-3 w-3" />
                                    {conv.modelUsed}
                                  </span>
                                  {conv._count?.messages && (
                                    <Badge variant="secondary" className="text-[10px] py-0">
                                      {conv._count.messages} {ui.messages}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                  {formatTime(conv.updatedAt, appLocale)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteId(conv.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {ui.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ui.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {ui.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Helper function to group conversations by date
function groupByDate(
  conversations: Conversation[],
  labels: typeof copy.en.groups
): Record<string, Conversation[]> {
  const groups: Record<string, Conversation[]> = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt)
    date.setHours(0, 0, 0, 0)

    let group: string
    if (date.getTime() === today.getTime()) {
      group = labels.today
    } else if (date.getTime() === yesterday.getTime()) {
      group = labels.yesterday
    } else if (date.getTime() > weekAgo.getTime()) {
      group = labels.thisWeek
    } else {
      group = labels.older
    }

    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(conv)
  }

  return groups
}

// Helper function to format time
function formatTime(date: Date, locale: AppLocale): string {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'

  if (isToday) {
    return d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
  }

  return d.toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
