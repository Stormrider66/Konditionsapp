'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Filter,
  MessageSquare,
  Search,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePageFrame, RolePageHeader, RolePanel, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface CareTeamThread {
  id: string
  subject: string
  description: string | null
  status: string
  priority: string
  lastMessageAt: string | null
  createdAt: string
  client: {
    id: string
    name: string
    email: string
  }
  createdBy: {
    id: string
    name: string
    role: string
  }
  participants: {
    user: {
      id: string
      name: string
      role: string
    }
  }[]
  lastMessage: {
    id: string
    content: string
    createdAt: string
    sender: {
      id: string
      name: string
    }
  } | null
  unreadCount: number
  _count: {
    messages: number
  }
}

interface CareTeamThreadsResponse {
  threads?: CareTeamThread[]
  total?: number
}

const priorityColors: Record<string, string> = {
  URGENT: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  NORMAL: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  LOW: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
}

const statusColors: Record<string, string> = {
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  WAITING_ON_ATHLETE: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  WAITING_ON_COACH: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  RESOLVED: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
  CLOSED: 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500',
}

const formatFallbackLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function BusinessPhysioMessagesPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`
  const t = useTranslations('components.careTeam.inbox')

  const [threads, setThreads] = useState<CareTeamThread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [total, setTotal] = useState(0)

  const statusLabels: Record<string, string> = {
    OPEN: t('status.open'),
    IN_PROGRESS: t('status.inProgress'),
    WAITING_ON_ATHLETE: 'Waiting on athlete',
    WAITING_ON_COACH: 'Waiting on coach',
    RESOLVED: t('status.resolved'),
    CLOSED: t('status.closed'),
  }

  const priorityLabels: Record<string, string> = {
    URGENT: t('priority.urgent'),
    HIGH: t('priority.high'),
    NORMAL: t('priority.normal'),
    LOW: t('priority.low'),
  }

  useEffect(() => {
    const fetchThreads = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (statusFilter !== 'all') query.set('status', statusFilter)
        if (priorityFilter !== 'all') query.set('priority', priorityFilter)

        const res = await fetch(`/api/care-team/threads?${query.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as CareTeamThreadsResponse
          const fetchedThreads = data.threads ?? []
          const searchLower = search.trim().toLowerCase()
          const filteredThreads = searchLower
            ? fetchedThreads.filter((thread) =>
                thread.subject.toLowerCase().includes(searchLower) ||
                thread.client.name.toLowerCase().includes(searchLower)
              )
            : fetchedThreads

          setThreads(filteredThreads)
          setTotal(data.total ?? fetchedThreads.length)
        }
      } catch (error) {
        console.error('Error fetching threads:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = window.setTimeout(() => {
      void fetchThreads()
    }, 300)
    return () => window.clearTimeout(debounce)
  }, [search, statusFilter, priorityFilter])

  const getMessageCountLabel = (count: number) =>
    count === 1 ? t('messageSingular') : t('messagePlural', { count })

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Care team"
        title={t('title')}
        description={t('description')}
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search threads..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[190px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
              <SelectItem value="OPEN">{t('status.open')}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t('status.inProgress')}</SelectItem>
              <SelectItem value="WAITING_ON_ATHLETE">Waiting on athlete</SelectItem>
              <SelectItem value="RESOLVED">{t('status.resolved')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full lg:w-[190px]">
              <AlertTriangle className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder={t('filters.priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allPriority')}</SelectItem>
              <SelectItem value="URGENT">{t('priority.urgent')}</SelectItem>
              <SelectItem value="HIGH">{t('priority.high')}</SelectItem>
              <SelectItem value="NORMAL">{t('priority.normal')}</SelectItem>
              <SelectItem value="LOW">{t('priority.low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {threads.length} of {total} threads
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className={roleSkeletonClass('h-28')} />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">{t('emptyTitle')}</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Care team threads are opened from athlete injury reports.
          </p>
        </RolePanel>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`${basePath}/messages/${thread.id}`}
              className="block"
            >
              <RolePanel
                className={cn(
                  'p-5 transition-colors hover:border-violet-200 dark:hover:border-violet-900/60',
                  thread.unreadCount > 0 && 'border-violet-200 dark:border-violet-900/60'
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
                      <MessageSquare className="h-5 w-5" />
                      {thread.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[11px] font-semibold text-white">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3
                          className={cn(
                            'min-w-0 truncate text-base font-semibold',
                            thread.unreadCount > 0
                              ? 'text-zinc-950 dark:text-zinc-50'
                              : 'text-zinc-800 dark:text-zinc-200'
                          )}
                        >
                          {thread.subject}
                        </h3>
                        <Badge
                          variant="outline"
                          className={priorityColors[thread.priority] ?? priorityColors.NORMAL}
                        >
                          {priorityLabels[thread.priority] ?? formatFallbackLabel(thread.priority)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={statusColors[thread.status] ?? statusColors.OPEN}
                        >
                          {statusLabels[thread.status] ?? formatFallbackLabel(thread.status)}
                        </Badge>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <User className="h-4 w-4" />
                        <span>{thread.client.name}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">/</span>
                        <span>{getMessageCountLabel(thread._count.messages)}</span>
                      </div>
                      {thread.lastMessage && (
                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-500">
                          <span className="font-medium text-zinc-600 dark:text-zinc-400">
                            {thread.lastMessage.sender.name}:
                          </span>{' '}
                          {thread.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 lg:justify-end">
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      <Clock className="mr-1 inline h-3.5 w-3.5" />
                      {new Date(thread.lastMessageAt ?? thread.createdAt).toLocaleDateString()}
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-400" />
                  </div>
                </div>
              </RolePanel>
            </Link>
          ))}
        </div>
      )}
    </RolePageFrame>
  )
}
