'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Share2,
  Sparkles,
  Loader2,
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Instagram,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialPostData {
  id: string
  caption: string
  mediaUrl: string | null
  status: string
  isAiGenerated: boolean
  createdAt: string
  publishes: Array<{
    id: string
    status: string
    scheduledAt: string | null
    publishedAt: string | null
    account: { platform: string; accountName: string }
  }>
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  DRAFT: { label: 'Utkast', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: FileText },
  APPROVED: { label: 'Godkänt', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle2 },
  QUEUED: { label: 'I kö', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  PUBLISHED: { label: 'Publicerat', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  FAILED: { label: 'Misslyckades', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
}

const platformIcons: Record<string, string> = {
  INSTAGRAM: '📸',
  FACEBOOK: '📘',
  TIKTOK: '🎵',
  LINKEDIN: '💼',
  GOOGLE_BUSINESS: '📍',
  THREADS: '🧵',
}

interface SocialMediaCardProps {
  basePath?: string
}

export function SocialMediaCard({ basePath = '' }: SocialMediaCardProps) {
  const [posts, setPosts] = useState<SocialPostData[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/social/posts')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const generateCaption = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setGeneratedCaption(null)
    try {
      const res = await fetch('/api/coach/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform: 'instagram' }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedCaption(data.caption)
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const saveAsDraft = async () => {
    if (!generatedCaption) return
    setSaving(true)
    try {
      const res = await fetch('/api/coach/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: generatedCaption,
          isAiGenerated: true,
          triggerType: 'MANUAL',
          status: 'DRAFT',
        }),
      })
      if (res.ok) {
        setGeneratedCaption(null)
        setTopic('')
        fetchPosts()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const recentPosts = posts.slice(0, 5)
  const draftCount = posts.filter(p => p.status === 'DRAFT').length
  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-pink-500" />
            Sociala medier
          </GlassCardTitle>
          <div className="flex items-center gap-1">
            {draftCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">{draftCount} utkast</Badge>
            )}
            {publishedCount > 0 && (
              <Badge className="text-[10px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">{publishedCount} publicerade</Badge>
            )}
            <Link href={`${basePath}/coach/social`}>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2">Hantera</Button>
            </Link>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* AI Generate */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Beskriv vad du vill posta..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateCaption()}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={generateCaption}
              disabled={generating || !topic.trim()}
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </>
              )}
            </Button>
          </div>

          {generatedCaption && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 space-y-2">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI-genererat förslag
              </p>
              <p className="text-sm whitespace-pre-wrap">{generatedCaption}</p>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={saveAsDraft} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><FileText className="h-3 w-3 mr-1" /> Spara utkast</>}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGeneratedCaption(null)}>
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Recent posts */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Instagram className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga inlägg ännu</p>
            <p className="text-xs mt-1">Använd AI för att skapa ditt första inlägg</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Senaste inlägg</p>
            {recentPosts.map(post => {
              const config = statusConfig[post.status] || statusConfig.DRAFT
              const StatusIcon = config.icon
              return (
                <div key={post.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                  <StatusIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{post.caption.slice(0, 80)}{post.caption.length > 80 ? '...' : ''}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className={cn('text-[10px] h-4', config.color)}>{config.label}</Badge>
                      {post.isAiGenerated && (
                        <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                      )}
                      {post.publishes.map(p => (
                        <span key={p.id} className="text-[10px]" title={p.account.accountName}>
                          {platformIcons[p.account.platform] || '📱'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(post.createdAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
