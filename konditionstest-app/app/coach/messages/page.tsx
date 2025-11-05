// app/coach/messages/page.tsx
'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    fetchMessages()
  }, [filter])

  useEffect(() => {
    // Mark messages as read when conversation is opened
    if (selectedAthleteId) {
      markConversationAsRead(selectedAthleteId)
    }
  }, [selectedAthleteId])

  async function fetchMessages() {
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
  }

  function groupMessagesByAthlete(msgs: Message[]) {
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
  }

  async function markConversationAsRead(athleteId: string) {
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
  }

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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          Meddelanden
        </h1>
        <p className="text-muted-foreground mt-1">
          Kommunicera med dina atleter
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Atleter
              </CardTitle>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-32">
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
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Inga meddelanden ännu</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.athleteId}
                    onClick={() => setSelectedAthleteId(conversation.athleteId)}
                    className={`w-full text-left p-4 border-b hover:bg-muted/50 transition ${
                      selectedAthleteId === conversation.athleteId
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold">{conversation.athleteName}</p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
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
              <CardHeader>
                <CardTitle>{selectedConversation.athleteName}</CardTitle>
                <CardDescription>{selectedConversation.athleteEmail}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] pr-4 mb-4">
                  <div className="space-y-4">
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
                              className={`max-w-[80%] rounded-lg p-4 ${
                                isCoach
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-sm font-semibold ${isCoach ? 'text-blue-100' : 'text-muted-foreground'}`}>
                                  {msg.sender.name}
                                </p>
                                {msg.workout && (
                                  <Badge variant="outline" className={isCoach ? 'border-blue-300 text-blue-100' : ''}>
                                    <Dumbbell className="h-3 w-3 mr-1" />
                                    {msg.workout.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className={`h-3 w-3 ${isCoach ? 'text-blue-200' : 'text-muted-foreground'}`} />
                                <p className={`text-xs ${isCoach ? 'text-blue-200' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.createdAt), 'PPp', { locale: sv })}
                                </p>
                                {isCoach && msg.isRead && (
                                  <MailOpen className="h-3 w-3 text-blue-200" />
                                )}
                                {isCoach && !msg.isRead && (
                                  <Mail className="h-3 w-3 text-blue-200" />
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
                    rows={4}
                    maxLength={1000}
                    disabled={sending}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {replyText.length}/1000 tecken
                    </p>
                    <Button
                      onClick={sendMessage}
                      disabled={!replyText.trim() || sending}
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
            <CardContent className="flex items-center justify-center h-full py-20">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Välj en atlet för att se meddelanden</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
