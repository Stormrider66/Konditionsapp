// components/navigation/MessagesLink.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MessagesLinkProps {
  role: 'COACH' | 'ATHLETE'
  variant?: 'mobile' | 'desktop'
  isActive?: boolean
}

export function MessagesLink({ role, variant = 'desktop', isActive = false }: MessagesLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const href = role === 'COACH' ? '/coach/messages' : '/athlete/messages'

  useEffect(() => {
    fetchUnreadCount()
    // Poll every 30 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/messages?filter=unread')
      const result = await response.json()

      if (response.ok && result.success) {
        setUnreadCount(result.data.length)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-6 py-3 transition ${
          isActive
            ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </div>
        <span className="font-medium">Meddelanden</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition relative ${
        isActive
          ? 'bg-white/20'
          : 'hover:bg-white/10'
      }`}
    >
      <MessageSquare className="w-5 h-5" />
      <span className="font-medium">Meddelanden</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Link>
  )
}
