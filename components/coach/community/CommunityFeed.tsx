'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

const typeConfig: Record<string, { label: string; icon: typeof Megaphone; color: string }> = {
  ANNOUNCEMENT: { label: 'Nyhet', icon: Megaphone, color: 'text-blue-500' },
  MOTIVATION: { label: 'Motivation', icon: Zap, color: 'text-yellow-500' },
  ACHIEVEMENT: { label: 'Prestation', icon: Trophy, color: 'text-green-500' },
  GENERAL: { label: 'Inlägg', icon: Users, color: 'text-slate-500' },
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just nu'
  if (mins < 60) return `${mins}m sedan`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h sedan`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d sedan`
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<CommunityPostData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // New post
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('GENERAL')
  const [posting, setPosting] = useState(false)

  // Comment state
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/community')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setCurrentUserId(data.currentUserId || '')
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const createPost = async () => {
    if (!newContent.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/coach/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent, type: newType }),
      })
      if (res.ok) {
        setNewContent('')
        setNewType('GENERAL')
        fetchPosts()
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
      fetchPosts()
    } catch {
      fetchPosts()
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
      fetchPosts()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Create post */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Dela en nyhet, motivationspost eller prestation..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={3}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto">
              {Object.entries(typeConfig).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={key}
                    variant={newType === key ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs h-7 shrink-0"
                    onClick={() => setNewType(key)}
                  >
                    <Icon className={cn('h-3 w-3 mr-1', newType !== key && config.color)} />
                    {config.label}
                  </Button>
                )
              })}
            </div>
            <Button onClick={createPost} disabled={posting || !newContent.trim()} size="sm" className="shrink-0 self-end">
              {posting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
              Publicera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Tomt här ännu</p>
          <p className="text-sm mt-1">Dela det första inlägget med dina medlemmar!</p>
        </div>
      ) : (
        posts.map(post => {
          const config = typeConfig[post.type] || typeConfig.GENERAL
          const TypeIcon = config.icon
          return (
            <Card key={post.id} className={cn(post.isPinned && 'border-yellow-200 dark:border-yellow-800/30')}>
              <CardContent className="p-4">
                {/* Post header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {getInitials(post.author.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{post.author.name}</span>
                      {post.type !== 'GENERAL' && (
                        <Badge variant="secondary" className="text-[10px] h-4">
                          <TypeIcon className={cn('h-2.5 w-2.5 mr-0.5', config.color)} />
                          {config.label}
                        </Badge>
                      )}
                      {post.isPinned && <Pin className="h-3 w-3 text-yellow-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Heart className={cn('h-4 w-4', post.likesCount > 0 && 'fill-red-500 text-red-500')} />
                    {post.likesCount > 0 && post.likesCount}
                  </button>
                  <button
                    onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.commentsCount > 0 && post.commentsCount}
                  </button>
                </div>

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-100 dark:border-white/10">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-medium">{comment.author.name}</span>
                        <span className="text-muted-foreground"> · {formatTimeAgo(comment.createdAt)}</span>
                        <p className="text-muted-foreground mt-0.5">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {commentingOn === post.id && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Skriv en kommentar..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8" onClick={() => addComment(post.id)} disabled={!commentText.trim()}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
