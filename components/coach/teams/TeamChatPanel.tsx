'use client'

// Team channel chat panel (design: docs/TEAM_CHAT_DESIGN.md).
// Live updates arrive via a private Supabase Realtime broadcast channel
// (DB trigger on ThreadMessage → topic `thread:{id}`); a 30s poll remains as
// the degraded mode for missed broadcasts and failed subscriptions.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from '@/i18n/client'
import { Button } from '@/components/ui/button'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
} from '@/components/layouts/role-shell/RolePage'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const POLL_INTERVAL_MS = 30_000

interface ChatSender {
  id: string
  name: string
  role: string
}

interface ChatMessage {
  id: string
  content: string
  createdAt: string
  sender: ChatSender
}

interface TeamChatPanelProps {
  teamId: string
  businessSlug: string
}

export function TeamChatPanel({ teamId, businessSlug }: TeamChatPanelProps) {
  const t = useTranslations('coach.pages.teamDetail')
  const locale = useLocale()

  const [threadId, setThreadId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([]) // oldest → newest
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(true)

  const qs = `businessSlug=${encodeURIComponent(businessSlug)}`

  const markRead = useCallback(
    (id: string) => {
      fetch(`/api/threads/${id}/read?${qs}`, { method: 'PATCH' }).catch(() => {})
    },
    [qs]
  )

  // Resolve the channel, then load the latest page of messages.
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const channelRes = await fetch(`/api/threads/team/${teamId}?${qs}`)
        if (!channelRes.ok) throw new Error()
        const channel = await channelRes.json()
        if (cancelled) return

        setThreadId(channel.thread.id)
        setCurrentUserId(channel.currentUserId)

        const messagesRes = await fetch(`/api/threads/${channel.thread.id}/messages?${qs}`)
        if (!messagesRes.ok) throw new Error()
        const data = await messagesRes.json()
        if (cancelled) return

        setMessages([...data.messages].reverse())
        setNextCursor(data.nextCursor)
        markRead(channel.thread.id)
      } catch {
        if (!cancelled) setError(t('chat.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, qs])

  const fetchNewMessages = useCallback(async () => {
    if (!threadId) return
    try {
      const res = await fetch(`/api/threads/${threadId}/messages?${qs}&limit=50`)
      if (!res.ok) return
      const data = await res.json()
      const incoming: ChatMessage[] = [...data.messages].reverse()
      setMessages((current) => {
        const known = new Set(current.map((m) => m.id))
        const fresh = incoming.filter((m) => !known.has(m.id))
        if (fresh.length === 0) return current
        markRead(threadId)
        return [...current, ...fresh]
      })
    } catch {
      // transient fetch failure — the next poll/broadcast retries
    }
  }, [threadId, qs, markRead])

  // Degraded mode: poll while the tab is visible. Covers sessions where the
  // Realtime subscription fails (e.g. JWT claims absent) or broadcasts drop.
  useEffect(() => {
    if (!threadId) return

    const interval = setInterval(() => {
      if (!document.hidden) void fetchNewMessages()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [threadId, fetchNewMessages])

  // Live updates: private broadcast channel fed by the ThreadMessage DB
  // trigger. The payload is the raw row, so we refetch the delta through the
  // API instead — messages always arrive with sender info attached.
  useEffect(() => {
    if (!threadId) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let cancelled = false

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session) return

      await supabase.realtime.setAuth(session.access_token)
      channel = supabase
        .channel(`thread:${threadId}`, { config: { private: true } })
        .on('broadcast', { event: 'INSERT' }, () => void fetchNewMessages())
        .subscribe()
    }

    void subscribe()
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [threadId, fetchNewMessages])

  useEffect(() => {
    if (shouldScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  async function loadOlder() {
    if (!threadId || !nextCursor) return
    setLoadingOlder(true)
    shouldScrollRef.current = false
    try {
      const res = await fetch(`/api/threads/${threadId}/messages?${qs}&cursor=${nextCursor}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages((current) => [...[...data.messages].reverse(), ...current])
      setNextCursor(data.nextCursor)
    } finally {
      setLoadingOlder(false)
    }
  }

  async function sendMessage() {
    const content = draft.trim()
    if (!threadId || !content || sending) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/threads/${threadId}/messages?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      const message: ChatMessage = await res.json()
      shouldScrollRef.current = true
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message]
      )
      setDraft('')
    } catch {
      setError(t('chat.sendError'))
    } finally {
      setSending(false)
    }
  }

  function formatTimestamp(iso: string) {
    const date = new Date(iso)
    const today = new Date()
    const sameDay = date.toDateString() === today.toDateString()
    return sameDay
      ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleString(locale, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error && messages.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>
  }

  return (
    <Card>
      <CardContent className="flex h-[60vh] min-h-[420px] flex-col gap-3 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {nextCursor && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                {t('chat.loadOlder')}
              </Button>
            </div>
          )}

          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('chat.empty')}</p>
          )}

          {messages.map((message) => {
            const isOwn = message.sender.id === currentUserId
            return (
              <div key={message.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-foreground dark:bg-slate-800'
                  )}
                >
                  {!isOwn && (
                    <p className="mb-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {message.sender.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-right text-[10px]',
                      isOwn ? 'text-blue-100' : 'text-muted-foreground'
                    )}
                  >
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {error && messages.length > 0 && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={t('chat.placeholder')}
            rows={2}
            className="min-h-[44px] flex-1 resize-none"
            maxLength={4000}
          />
          <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
