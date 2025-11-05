// app/athlete/messages/page.tsx
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
  Clock,
  Mail,
  MailOpen,
  Dumbbell,
  User,
} from 'lucide-react'

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

export default function AthleteMessagesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [coachInfo, setCoachInfo] = useState<{ id: string; name: string; email: string } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    // Mark coach messages as read when page loads
    if (messages.length > 0) {
      markMessagesAsRead()
    }
  }, [messages])

  async function fetchMessages() {
    try {
      setLoading(true)
      const response = await fetch('/api/messages')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att hämta meddelanden')
      }

      const fetchedMessages = result.data as Message[]
      setMessages(fetchedMessages)

      // Determine current user and coach from messages
      if (fetchedMessages.length > 0) {
        const firstMessage = fetchedMessages[0]

        // Current user is the athlete
        const userId = firstMessage.sender.role === 'ATHLETE'
          ? firstMessage.senderId
          : firstMessage.receiverId
        setCurrentUserId(userId)

        // Coach is the other person in the conversation
        const coach = firstMessage.sender.role === 'COACH' || firstMessage.sender.role === 'ADMIN'
          ? firstMessage.sender
          : firstMessage.receiver

        setCoachInfo({
          id: coach.id,
          name: coach.name,
          email: coach.email,
        })
      }
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

  async function markMessagesAsRead() {
    // Mark all unread messages from coach as read
    const unreadCoachMessages = messages.filter(
      (msg) => !msg.isRead && (msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN')
    )

    for (const msg of unreadCoachMessages) {
      try {
        await fetch(`/api/messages/${msg.id}`, {
          method: 'PATCH',
        })
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }

    // Refresh if there were unread messages
    if (unreadCoachMessages.length > 0) {
      await fetchMessages()
    }
  }

  async function sendMessage() {
    if (!replyText.trim() || !coachInfo) return

    try {
      setSending(true)

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: coachInfo.id,
          content: replyText.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att skicka meddelande')
      }

      toast({
        title: 'Meddelande skickat',
        description: 'Ditt meddelande har skickats till din coach.',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          Meddelanden
        </h1>
        <p className="text-muted-foreground mt-1">
          Konversation med din coach
        </p>
      </div>

      <Card>
        {coachInfo ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{coachInfo.name}</CardTitle>
                  <CardDescription>{coachInfo.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Message Thread */}
              <ScrollArea className="h-[500px] pr-4 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Inga meddelanden ännu</p>
                    <p className="text-sm mt-2">Skicka ett meddelande till din coach</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((msg) => {
                        const isCoach = msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN'
                        const isAthlete = msg.sender.role === 'ATHLETE'
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAthlete ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                isAthlete
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-sm font-semibold ${isAthlete ? 'text-blue-100' : 'text-muted-foreground'}`}>
                                  {msg.sender.name}
                                </p>
                                {msg.workout && (
                                  <Badge variant="outline" className={isAthlete ? 'border-blue-300 text-blue-100' : ''}>
                                    <Dumbbell className="h-3 w-3 mr-1" />
                                    {msg.workout.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className={`h-3 w-3 ${isAthlete ? 'text-blue-200' : 'text-muted-foreground'}`} />
                                <p className={`text-xs ${isAthlete ? 'text-blue-200' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.createdAt), 'PPp', { locale: sv })}
                                </p>
                                {isAthlete && msg.isRead && (
                                  <MailOpen className="h-3 w-3 text-blue-200" />
                                )}
                                {isAthlete && !msg.isRead && (
                                  <Mail className="h-3 w-3 text-blue-200" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </ScrollArea>

              {/* Reply Form */}
              <div className="space-y-2 pt-4 border-t">
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
          <CardContent className="flex items-center justify-center py-20">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Inga meddelanden från din coach ännu</p>
              <p className="text-sm">När din coach skickar ett meddelande kommer det visas här</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
