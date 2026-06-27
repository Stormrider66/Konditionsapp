// app/coach/messages/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  Filter,
  Mail,
  MailOpen,
  Clock,
  Dumbbell,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations, useLocale } from '@/i18n/client'

interface Message {
  id: string
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  senderId: string
  receiverId: string
  sender: {
    id: string
    name: string
    email: string
    role: string
  }
  receiver: {
    id: string
    name: string
    email: string
    role: string
  }
  workout?: {
    id: string
    name: string
    type: string
  } | null
}

interface AthleteConversation {
  athleteId: string
  athleteName: string
  athleteEmail: string
  messages: Message[]
  unreadCount: number
  lastMessage: Message
}

export default function CoachMessagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('components.coachMessages')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<AthleteConversation[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [replyText, setReplyText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const groupMessagesByAthlete = useCallback((msgs: Message[]) => {
    const athleteMap = new Map<string, AthleteConversation>()

    msgs.forEach((msg) => {
      // Determine which user is the athlete (not coach)
      const isCoachSender = msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN'
      const athlete = isCoachSender ? msg.receiver : msg.sender
      const athleteId = athlete.id

      if (!athleteMap.has(athleteId)) {
        athleteMap.set(athleteId, {
          athleteId,
          athleteName: athlete.name,
          athleteEmail: athlete.email,
          messages: [],
          unreadCount: 0,
          lastMessage: msg,
        })
      }

      const conversation = athleteMap.get(athleteId)!
      conversation.messages.push(msg)

      // Count unread messages sent by athlete to coach
      if (!msg.isRead && msg.sender.id === athleteId) {
        conversation.unreadCount++
      }

      // Update last message if this one is more recent
      if (new Date(msg.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = msg
      }
    })

    // Convert to array and sort by last message time
    const conversationsList = Array.from(athleteMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    )

    setConversations(conversationsList)

    // Auto-select first conversation if none selected
    if (!selectedAthleteId && conversationsList.length > 0) {
      setSelectedAthleteId(conversationsList[0].athleteId)
    }
  }, [selectedAthleteId])

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (filter === 'unread') {
        queryParams.append('filter', 'unread')
      }

      const response = await fetch(`/api/messages?${queryParams.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('errors.fetchFailed'))
      }

      const fetchedMessages = result.data as Message[]
      setMessages(fetchedMessages)

      // Determine current user ID from messages
      if (fetchedMessages.length > 0) {
        const firstMessage = fetchedMessages[0]
        // Current user is either sender or receiver - determine by role
        const userId = firstMessage.sender.role === 'COACH'
          ? firstMessage.senderId
          : firstMessage.receiverId
        setCurrentUserId(userId)
      }

      // Group messages by athlete
      groupMessagesByAthlete(fetchedMessages)
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      toast({
        title: t('errors.fetchFailedTitle'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filter, groupMessagesByAthlete, toast])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const markConversationAsRead = useCallback(async (athleteId: string) => {
    const conversation = conversations.find((c) => c.athleteId === athleteId)
    if (!conversation) return

    // Mark all unread messages from athlete as read
    const unreadMessages = conversation.messages.filter(
      (msg) => !msg.isRead && msg.senderId === athleteId
    )

    for (const msg of unreadMessages) {
      try {
        await fetch(`/api/messages/${msg.id}`, {
          method: 'PATCH',
        })
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }

    // Refresh messages
    await fetchMessages()
  }, [conversations, fetchMessages])

  useEffect(() => {
    // Mark messages as read when conversation is opened
    if (selectedAthleteId) {
      markConversationAsRead(selectedAthleteId)
    }
  }, [selectedAthleteId, markConversationAsRead])

  async function sendMessage() {
    if (!replyText.trim() || !selectedAthleteId) return

    try {
      setSending(true)

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedAthleteId,
          content: replyText.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('errors.sendFailed'))
      }

      toast({
        title: t('toasts.sent.title'),
        description: t('toasts.sent.description'),
      })

      setReplyText('')
      await fetchMessages()
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: t('errors.sendFailedTitle'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedConversation = conversations.find(
    (c) => c.athleteId === selectedAthleteId
  )

  const filteredConversations = filter === 'unread'
    ? conversations.filter((c) => c.unreadCount > 0)
    : conversations

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('subtitle')}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Conversation List */}
        <RolePanel className="overflow-hidden lg:col-span-1">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50 sm:text-lg">
                <Users className="h-5 w-5 flex-shrink-0" />
                {t('sidebar.title')}
              </h2>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="min-h-[44px] w-full border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60 sm:w-32">
                  <Filter className="h-4 w-4 text-zinc-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  <SelectItem value="unread">{t('filters.unread')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-0">
            {filteredConversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                <MessageSquare className="mx-auto mb-2 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm sm:text-base">{t('empty.messages')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.athleteId}
                    onClick={() => setSelectedAthleteId(conversation.athleteId)}
                    className={`min-h-[80px] w-full border-b border-zinc-200 p-3 text-left transition hover:bg-zinc-50 active:bg-zinc-100 dark:border-white/10 dark:hover:bg-zinc-900/60 dark:active:bg-zinc-900 sm:p-4 ${
                      selectedAthleteId === conversation.athleteId
                        ? 'border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-950/20'
                        : ''
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="flex-1 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50 sm:text-base">{conversation.athleteName}</p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0 min-w-[24px]">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                      {conversation.lastMessage.content}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {format(new Date(conversation.lastMessage.createdAt), 'PPp', {
                        locale: dateLocale,
                      })}
                    </p>
                  </button>
                ))}
              </ScrollArea>
            )}
          </div>
        </RolePanel>

        {/* Message Thread */}
        <RolePanel className="overflow-hidden lg:col-span-2">
          {selectedConversation ? (
            <>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10 sm:px-6">
                <h2 className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-50 sm:text-lg">{selectedConversation.athleteName}</h2>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">{selectedConversation.athleteEmail}</p>
              </div>
              <div className="px-3 py-4 sm:px-6">
                <ScrollArea className="mb-4 h-[300px] pr-2 sm:h-[400px] sm:pr-4 lg:h-[450px]">
                  <div className="space-y-3 sm:space-y-4">
                    {selectedConversation.messages
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((msg) => {
                        const isCoach = msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN'
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                                isCoach
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <p className={`text-xs font-semibold sm:text-sm ${isCoach ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                  {msg.sender.name}
                                </p>
                                {msg.workout && (
                                  <Badge variant="outline" className={`text-xs ${isCoach ? 'border-blue-300 text-blue-100' : ''}`}>
                                    <Dumbbell className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{msg.workout.name}</span>
                                  </Badge>
                                )}
                              </div>
                              <p className="whitespace-pre-wrap break-words text-xs sm:text-sm">{msg.content}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Clock className={`h-3 w-3 flex-shrink-0 ${isCoach ? 'text-blue-200' : 'text-zinc-500 dark:text-zinc-400'}`} />
                                <p className={`text-xs ${isCoach ? 'text-blue-200' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                  {format(new Date(msg.createdAt), 'PPp', { locale: dateLocale })}
                                </p>
                                {isCoach && msg.isRead && (
                                  <MailOpen className="h-3 w-3 text-blue-200 flex-shrink-0" />
                                )}
                                {isCoach && !msg.isRead && (
                                  <Mail className="h-3 w-3 text-blue-200 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>

                {/* Reply Form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder={t('reply.placeholder')}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    disabled={sending}
                    className="min-h-[80px] border-zinc-200 bg-white text-sm dark:border-white/10 dark:bg-zinc-950/60 sm:text-base"
                  />
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                      {replyText.length}/1000 {t('reply.characterCount')}
                    </p>
                    <Button
                      onClick={sendMessage}
                      disabled={!replyText.trim() || sending}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('reply.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {t('reply.send')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-4 py-20">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700 sm:h-16 sm:w-16" />
                <p className="text-sm sm:text-base">{t('empty.chooseAthlete')}</p>
              </div>
            </div>
          )}
        </RolePanel>
      </div>
    </RolePageFrame>
  )
}
