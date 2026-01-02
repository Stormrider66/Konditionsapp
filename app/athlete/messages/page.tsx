// app/athlete/messages/page.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Loader2, MessageSquare, User, Dumbbell, Clock, MailOpen, Mail, Send, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface MessageUser {
  id: string
  name: string
  email: string
  role: 'COACH' | 'ATHLETE' | 'ADMIN'
}

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  senderName?: string
  createdAt: string
  read: boolean
  relatedWorkoutId?: string
  relatedWorkout?: { name: string }
  sender: MessageUser
  receiver: MessageUser
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

  // Fetch coach info directly from API
  const fetchCoachInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/athlete/coach')
      const result = await response.json()

      if (response.ok && result.success) {
        setCoachInfo({
          id: result.data.id,
          name: result.data.name,
          email: result.data.email,
        })
        return true
      }
    } catch (error) {
      console.error('Error fetching coach info:', error)
    }
    return false
  }, [])

  const fetchMessages = useCallback(async () => {
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
      } else {
        // No messages yet - fetch coach info directly
        await fetchCoachInfo()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ett fel uppstod'
      console.error('Error fetching messages:', error)
      toast({
        title: 'Kunde inte hämta meddelanden',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast, fetchCoachInfo])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const markMessagesAsRead = useCallback(async (messagesToProcess: Message[]) => {
    // Mark all unread messages from coach as read
    const unreadCoachMessages = messagesToProcess.filter(
      (msg) => !msg.read && (msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN')
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
  }, [fetchMessages])

  useEffect(() => {
    if (messages.length === 0) return
    markMessagesAsRead(messages)
  }, [messages, markMessagesAsRead])

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ett fel uppstod'
      console.error('Error sending message:', error)
      toast({
        title: 'Kunde inte skicka meddelande',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 selection:bg-orange-500/30 font-sans">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl relative z-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <MessageSquare className="h-6 w-6 text-orange-400" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                Meddelanden
              </h1>
            </div>
            <p className="text-slate-400 font-medium ml-1">
              Direktkontakt med din huvudcoach
            </p>
          </div>
        </div>

        <GlassCard className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
          {coachInfo ? (
            <>
              <GlassCardHeader className="border-b border-white/5 bg-white/[0.02] p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <User className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <GlassCardTitle className="text-xl font-black italic tracking-tight text-white">{coachInfo.name}</GlassCardTitle>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{coachInfo.email}</p>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="p-0">
                {/* Message Thread */}
                <ScrollArea className="h-[550px] p-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-24">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="h-10 w-10 text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Inga meddelanden ännu</p>
                      <p className="text-slate-500 text-xs mt-2">Börja konversationen genom att skicka ett meddelande nedan</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((msg) => {
                          const isCoach = msg.sender.role === 'COACH' || msg.sender.role === 'ADMIN'
                          const isAthlete = msg.sender.role === 'ATHLETE'
                          return (
                            <div
                              key={msg.id}
                              className={cn("flex flex-col", isAthlete ? 'items-end' : 'items-start')}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-xl transition-all duration-300",
                                  isAthlete
                                    ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-tr-none border border-orange-500/30'
                                    : 'bg-white/5 backdrop-blur-md text-slate-200 rounded-tl-none border border-white/10'
                                )}
                              >
                                {!isAthlete && (
                                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                                    {msg.sender.name}
                                  </p>
                                )}

                                {msg.relatedWorkout && (
                                  <div className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg mb-3 text-xs font-bold",
                                    isAthlete ? 'bg-black/20 text-orange-100' : 'bg-white/5 text-blue-400'
                                  )}>
                                    <Dumbbell className="h-3 w-3" />
                                    <span>Referens: {msg.relatedWorkout.name}</span>
                                  </div>
                                )}

                                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                                  {msg.content}
                                </p>

                                <div className={cn(
                                  "flex items-center gap-2 mt-3 text-[10px] font-black uppercase tracking-widest opacity-60",
                                  isAthlete ? 'text-orange-100' : 'text-slate-500'
                                )}>
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(msg.createdAt), 'HH:mm • d MMM', { locale: sv })}</span>

                                  {isAthlete && (
                                    <div className="ml-auto">
                                      {msg.read ? (
                                        <MailOpen className="h-3 w-3 text-orange-200" />
                                      ) : (
                                        <Mail className="h-3 w-3 text-orange-200" />
                                      )}
                                    </div>
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
                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                  <div className="relative group">
                    <Textarea
                      placeholder="Skriv ett meddelande..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      disabled={sending}
                      className="bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:ring-orange-500/20 focus:border-orange-500/50 resize-none rounded-xl pr-12 transition-all duration-300"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {replyText.length}/1000
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={sendMessage}
                      disabled={!replyText.trim() || sending}
                      className={cn(
                        "rounded-xl h-12 px-8 text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg",
                        sending
                          ? "bg-slate-800 text-slate-500"
                          : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20 hover:shadow-orange-600/40"
                      )}
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Skickar...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-2" />
                          Skicka meddelande
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </GlassCardContent>
            </>
          ) : (
            <GlassCardContent className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8">
                <ShieldAlert className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-black italic tracking-tight text-white mb-2 uppercase">Ingen coach kopplad</h3>
              <p className="text-slate-500 max-w-sm text-sm font-medium">
                Du behöver en tilldelad coach för att kunna använda meddelandefunktionen.
              </p>
            </GlassCardContent>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
