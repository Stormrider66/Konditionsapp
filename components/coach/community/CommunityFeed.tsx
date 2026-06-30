'use client'

import { useState, useEffect, useCallback } from 'react'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Heart,
  MessageCircle,
  Send,
  Pin,
  Megaphone,
  Loader2,
  Trophy,
  Zap,
  Users,
  Bell,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

interface CommunityComment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string }
}

interface CommunityPostData {
  id: string
  content: string
  mediaUrl: string | null
  type: string
  isPinned: boolean
  likesCount: number
  commentsCount: number
  createdAt: string
  author: { id: string; name: string }
  comments: CommunityComment[]
}

const typeConfig: Record<string, { labelKey: string; icon: typeof Megaphone; color: string }> = {
  ANNOUNCEMENT: { labelKey: 'types.announcement', icon: Megaphone, color: 'text-blue-500' },
  MOTIVATION: { labelKey: 'types.motivation', icon: Zap, color: 'text-amber-500' },
  ACHIEVEMENT: { labelKey: 'types.achievement', icon: Trophy, color: 'text-amber-500' },
  GENERAL: { labelKey: 'types.general', icon: Users, color: 'text-zinc-500' },
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function CommunityFeed() {
  const t = useTranslations('coach.pages.community.feed')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [posts, setPosts] = useState<CommunityPostData[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  // New post
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('GENERAL')
  const [posting, setPosting] = useState(false)
  const [notifyInApp, setNotifyInApp] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(false)

  // Comment state
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/community')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setNow(Date.now())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchPosts() }, [fetchPosts])

  const formatTimeAgo = (dateStr: string): string => {
    const diff = now - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('time.now')
    if (mins < 60) return t('time.minutesAgo', { count: mins })
    const hours = Math.floor(mins / 60)
    if (hours < 24) return t('time.hoursAgo', { count: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('time.daysAgo', { count: days })
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
  }

  const createPost = async () => {
    if (!newContent.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/coach/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          type: newType,
          notifyInApp,
          notifyEmail,
        }),
      })
      if (res.ok) {
        setNewContent('')
        setNewType('GENERAL')
        setNotifyInApp(false)
        setNotifyEmail(false)
        void fetchPosts()
      }
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p
    ))
    try {
      await fetch('/api/coach/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', postId }),
      })
      void fetchPosts()
    } catch {
      void fetchPosts()
    }
  }

  const addComment = async (postId: string) => {
    if (!commentText.trim()) return
    try {
      await fetch('/api/coach/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', postId, content: commentText }),
      })
      setCommentText('')
      setCommentingOn(null)
      void fetchPosts()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Create post */}
      <RolePanel className="space-y-3 p-4">
        <Textarea
          placeholder={t('newPostPlaceholder')}
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          rows={3}
          className="border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
        />
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto">
            {Object.entries(typeConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={key}
                  variant={newType === key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setNewType(key)}
                >
                  <Icon className={cn('h-3 w-3', newType !== key && config.color)} />
                  {t(config.labelKey)}
                </Button>
              )
            })}
          </div>
          <Button onClick={createPost} disabled={posting || !newContent.trim()} size="sm" className="shrink-0 self-end">
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {t('publish')}
          </Button>
        </div>
        {/* Notification toggles */}
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-3 dark:border-white/10">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t('notify')}</span>
          <button
            type="button"
            onClick={() => setNotifyInApp(!notifyInApp)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              notifyInApp
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            )}
          >
            <Bell className="h-3 w-3" />
            {t('inApp')}
          </button>
          <button
            type="button"
            onClick={() => setNotifyEmail(!notifyEmail)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              notifyEmail
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            )}
          >
            <Mail className="h-3 w-3" />
            {t('email')}
          </button>
        </div>
      </RolePanel>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : posts.length === 0 ? (
        <RolePanel className="p-10 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('emptyDescription')}</p>
        </RolePanel>
      ) : (
        posts.map(post => {
          const config = typeConfig[post.type] || typeConfig.GENERAL
          const TypeIcon = config.icon
          return (
            <RolePanel key={post.id} className={cn('p-4', post.isPinned && 'border-amber-200 dark:border-amber-800/40')}>
              {/* Post header */}
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200">
                  {getInitials(post.author.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{post.author.name}</span>
                    {post.type !== 'GENERAL' && (
                      <Badge variant="secondary" className="text-[10px] h-4">
                        <TypeIcon className={cn('h-2.5 w-2.5', config.color)} />
                        {t(config.labelKey)}
                      </Badge>
                    )}
                    {post.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* Content */}
              <p className="mb-3 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{post.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 border-t border-zinc-200 pt-3 dark:border-white/10">
                <button
                  onClick={() => toggleLike(post.id)}
                  className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-red-500 dark:text-zinc-400"
                >
                  <Heart className={cn('h-4 w-4', post.likesCount > 0 && 'fill-red-500 text-red-500')} />
                  {post.likesCount > 0 && post.likesCount}
                </button>
                <button
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-blue-500 dark:text-zinc-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.commentsCount > 0 && post.commentsCount}
                </button>
              </div>

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-zinc-100 pl-4 dark:border-white/10">
                  {post.comments.map(comment => (
                    <div key={comment.id} className="text-sm">
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">{comment.author.name}</span>
                      <span className="text-zinc-500 dark:text-zinc-400"> · {formatTimeAgo(comment.createdAt)}</span>
                      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {commentingOn === post.id && (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder={t('commentPlaceholder')}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                    className="h-8 border-zinc-200 bg-white text-sm dark:border-white/10 dark:bg-zinc-950/60"
                  />
                  <Button size="sm" className="h-8" onClick={() => addComment(post.id)} disabled={!commentText.trim()}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </RolePanel>
          )
        })
      )}
    </div>
  )
}
