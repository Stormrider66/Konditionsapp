'use client'

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  now: string
  title: string
  markAllRead: string
  empty: string
}> = {
  en: {
    now: 'Now',
    title: 'Messages',
    markAllRead: 'Mark all read',
    empty: 'No messages',
  },
  sv: {
    now: 'Nu',
    title: 'Meddelanden',
    markAllRead: 'Markera alla lästa',
    empty: 'Inga meddelanden',
  },
}

function formatTimeAgo(dateStr: string, locale: AppLocale): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return COPY[locale].now
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function BroadcastNotificationBell() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/athlete/broadcast-notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // silently fail
      }
    }

    void fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAllRead = async () => {
    try {
      await fetch('/api/athlete/broadcast-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">{copy.title}</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              {copy.markAllRead}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {copy.empty}
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-default',
                !n.isRead && 'bg-blue-50 dark:bg-blue-950/20'
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <span className={cn('font-medium text-sm flex-1', !n.isRead && 'font-semibold')}>
                  {n.title}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTimeAgo(n.createdAt, locale)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-3 left-1.5" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
