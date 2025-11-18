// app/coach/messages/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
        throw new Error(result.error || 'Misslyckades med att hämta meddelanden')
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
        title: 'Kunde inte hämta meddelanden',
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
        throw new Error(result.error || 'Misslyckades med att skicka meddelande')
      }

      toast({
        title: 'Meddelande skickat',
        description: 'Ditt meddelande har skickats till atleten.',
      })

      setReplyText('')
      await fetchMessages()
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: 'Kunde inte skicka meddelande',
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          Meddelanden
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Kommunicera med dina atleter
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-5 w-5 flex-shrink-0" />
                Atleter
              </CardTitle>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-full sm:w-32 min-h-[44px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="unread">Olästa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">Inga meddelanden ännu</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.athleteId}
                    onClick={() => setSelectedAthleteId(conversation.athleteId)}
                    className={`w-full text-left p-3 sm:p-4 border-b hover:bg-muted/50 active:bg-muted transition min-h-[80px] ${
                      selectedAthleteId === conversation.athleteId
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <p className="font-semibold text-sm sm:text-base truncate flex-1">{conversation.athleteName}</p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0 min-w-[24px]">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {conversation.lastMessage.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(conversation.lastMessage.createdAt), 'PPp', {
                        locale: sv,
                      })}
                    </p>
                  </button>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg truncate">{selectedConversation.athleteName}</CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">{selectedConversation.athleteEmail}</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[450px] pr-2 sm:pr-4 mb-4">
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
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className={`text-xs sm:text-sm font-semibold ${isCoach ? 'text-blue-100' : 'text-muted-foreground'}`}>
                                  {msg.sender.name}
                                </p>
                                {msg.workout && (
                                  <Badge variant="outline" className={`text-xs ${isCoach ? 'border-blue-300 text-blue-100' : ''}`}>
                                    <Dumbbell className="h-3 w-3 mr-1" />
                                    <span className="truncate max-w-[120px]">{msg.workout.name}</span>
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Clock className={`h-3 w-3 flex-shrink-0 ${isCoach ? 'text-blue-200' : 'text-muted-foreground'}`} />
                                <p className={`text-xs ${isCoach ? 'text-blue-200' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.createdAt), 'PPp', { locale: sv })}
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
                    placeholder="Skriv ditt meddelande här..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    disabled={sending}
                    className="text-sm sm:text-base min-h-[80px]"
                  />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {replyText.length}/1000 tecken
                    </p>
                    <Button
                      onClick={sendMessage}
                      disabled={!replyText.trim() || sending}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Skickar...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Skicka
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full py-20 px-4">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Välj en atlet för att se meddelanden</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
