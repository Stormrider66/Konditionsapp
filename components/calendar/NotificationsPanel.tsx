'use client'

/**
 * Notifications Panel Component
 *
 * Displays calendar change notifications for coaches and athletes
 * with the ability to mark as read and view details.
 */

import { useState } from 'react'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Bell,
  Calendar,
  CalendarX,
  Check,
  CheckCheck,
  ChevronRight,
  Loader2,
  RefreshCw,
  User,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Notification {
  id: string
  type: string
  description: string
  clientId: string
  clientName: string
  eventId?: string
  eventTitle?: string
  eventType?: string
  changedBy: {
    id: string
    name: string
    role: string
  }
  isRead: boolean
  readAt?: string
  createdAt: string
  previousData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

interface NotificationsPanelProps {
  clientId?: string // Optional: filter to specific client
  variant?: 'popover' | 'sheet' | 'inline'
}

const changeTypeConfig: Record<
  string,
  { icon: typeof Bell; label: string; color: string }
> = {
  EVENT_CREATED: {
    icon: Plus,
    label: 'Ny händelse',
    color: 'text-green-600 dark:text-green-400',
  },
  EVENT_UPDATED: {
    icon: Pencil,
    label: 'Händelse uppdaterad',
    color: 'text-blue-600 dark:text-blue-400',
  },
  EVENT_DELETED: {
    icon: Trash2,
    label: 'Händelse borttagen',
    color: 'text-red-600 dark:text-red-400',
  },
  WORKOUT_RESCHEDULED: {
    icon: ArrowRightLeft,
    label: 'Pass flyttat',
    color: 'text-purple-600 dark:text-purple-400',
  },
  CONFLICT_DETECTED: {
    icon: AlertTriangle,
    label: 'Konflikt upptäckt',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
}

export function NotificationsPanel({
  clientId,
  variant = 'popover',
}: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Build API URL
  const apiUrl = clientId
    ? `/api/calendar/notifications?clientId=${clientId}`
    : '/api/calendar/notifications'

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  })

  const notifications: Notification[] = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/calendar/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      mutate()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/calendar/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      mutate()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const content = (
    <NotificationsList
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      error={error}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onRefresh={() => mutate()}
    />
  )

  if (variant === 'inline') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notiser
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  if (variant === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notiser
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} olästa</Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Ändringar i kalender och träningspass
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  // Default: popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notiser
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} olästa</Badge>
            )}
          </div>
        </div>
        {content}
      </PopoverContent>
    </Popover>
  )
}

interface NotificationsListProps {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | undefined
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onRefresh: () => void
}

function NotificationsList({
  notifications,
  unreadCount,
  isLoading,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p>Kunde inte ladda notiser</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Försök igen
        </Button>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Inga notiser</p>
      </div>
    )
  }

  return (
    <>
      {unreadCount > 0 && (
        <div className="p-2 border-b bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Markera alla som lästa
          </Button>
        </div>
      )}
      <ScrollArea className="max-h-[400px]">
        <div className="divide-y">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const config = changeTypeConfig[notification.type] || {
    icon: Bell,
    label: 'Ändring',
    color: 'text-muted-foreground',
  }
  const Icon = config.icon

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: sv,
  })

  return (
    <div
      className={cn(
        'p-3 hover:bg-accent transition-colors cursor-pointer',
        !notification.isRead && 'bg-primary/5'
      )}
      onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted',
            config.color
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium leading-tight">
                {notification.description}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {notification.changedBy.name}
                </span>
                <span>•</span>
                <span>{notification.clientName}</span>
              </div>
            </div>

            {!notification.isRead && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Notification Bell Button for Navigation
 * Standalone component for easy integration into headers
 */
export function NotificationBell({ clientId }: { clientId?: string }) {
  return <NotificationsPanel clientId={clientId} variant="popover" />
}

/**
 * Hook to get notification count
 * Useful for showing badges in other places
 */
export function useNotificationCount(clientId?: string) {
  const apiUrl = clientId
    ? `/api/calendar/notifications?clientId=${clientId}&unreadOnly=true`
    : '/api/calendar/notifications?unreadOnly=true'

  const { data } = useSWR(apiUrl, fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  })

  return {
    unreadCount: data?.unreadCount || 0,
    total: data?.total || 0,
  }
}
