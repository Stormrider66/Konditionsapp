'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CardLoadError } from '@/components/coach/dashboard/CardLoadError'
import {
  CheckCircle2,
  Circle,
  Plus,
  ListTodo,
  Loader2,
  Users,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

interface CoachTaskData {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  completedAt: string | null
  isShared: boolean
  createdById: string
  assignedToId: string | null
  createdAt: string
  createdBy: { name: string }
  assignedTo: { name: string } | null
}

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-600 dark:text-red-400',
  HIGH: 'text-orange-600 dark:text-orange-400',
  NORMAL: 'text-slate-600 dark:text-slate-400',
  LOW: 'text-slate-400 dark:text-slate-500',
}

const priorityDots: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  NORMAL: 'bg-slate-400',
  LOW: 'bg-slate-300',
}

export function CoachTaskCard() {
  const t = useTranslations('components.coachTaskCard')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [tasks, setTasks] = useState<CoachTaskData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoadFailed(false)
    try {
      const res = await fetch('/api/coach/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      } else {
        setLoadFailed(true)
      }
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTasks()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchTasks])

  const addTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/coach/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (res.ok) {
        setNewTitle('')
        void fetchTasks()
      }
    } catch {
      // ignore
    } finally {
      setAdding(false)
    }
  }

  const toggleTask = async (task: CoachTaskData) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))

    try {
      await fetch('/api/coach/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      })
      void fetchTasks()
    } catch {
      void fetchTasks()
    }
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await fetch('/api/coach/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      void fetchTasks()
    }
  }

  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED')
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-500" />
            {t('title')}
          </GlassCardTitle>
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">{pendingTasks.length}</Badge>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Add task */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder={t('newTaskPlaceholder')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void addTask()
            }}
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 px-2" onClick={() => void addTask()} disabled={adding || !newTitle.trim()}>
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : loadFailed ? (
          <CardLoadError onRetry={() => void fetchTasks()} />
        ) : pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Pending tasks */}
            {pendingTasks.slice(0, 8).map(task => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} dateLocale={dateLocale} />
            ))}
            {pendingTasks.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                {t('more', { count: pendingTasks.length - 8 })}
              </p>
            )}

            {/* Completed tasks toggle */}
            {completedTasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 w-full text-left"
                >
                  {showCompleted ? t('hideCompleted', { count: completedTasks.length }) : t('showCompleted', { count: completedTasks.length })}
                </button>
                {showCompleted && completedTasks.slice(0, 5).map(task => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} dateLocale={dateLocale} />
                ))}
              </>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

function TaskRow({ task, onToggle, onDelete, dateLocale }: {
  task: CoachTaskData
  onToggle: (task: CoachTaskData) => void
  onDelete: (id: string) => void
  dateLocale: string
}) {
  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <button onClick={() => void onToggle(task)} className="flex-shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className={cn('h-4 w-4', priorityColors[task.priority] || 'text-slate-400')} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          isCompleted && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5">
          {task.isShared && (
            <Users className="h-2.5 w-2.5 text-muted-foreground" />
          )}
          {task.assignedTo && (
            <span className="text-[10px] text-muted-foreground">{task.assignedTo.name.split(' ')[0]}</span>
          )}
          {task.dueDate && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      {task.priority !== 'NORMAL' && !isCompleted && (
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', priorityDots[task.priority])} />
      )}
      <button
        onClick={() => void onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
      </button>
    </div>
  )
}
