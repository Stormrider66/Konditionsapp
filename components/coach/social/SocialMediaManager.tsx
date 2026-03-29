'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Loader2,
  Send,
  Trash2,
  Settings,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialPost {
  id: string
  caption: string
  mediaUrl: string | null
  mediaType: string | null
  status: string
  isAiGenerated: boolean
  triggerType: string | null
  createdAt: string
  createdBy: { name: string }
  publishes: Array<{
    id: string
    status: string
    scheduledAt: string | null
    publishedAt: string | null
    account: { platform: string; accountName: string }
  }>
}

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  isActive: boolean
  lastPostAt: string | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Utkast', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  APPROVED: { label: 'Godkänt', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  QUEUED: { label: 'I kö', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  PUBLISHED: { label: 'Publicerat', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED: { label: 'Misslyckades', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const platformLabels: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  GOOGLE_BUSINESS: 'Google Business',
  THREADS: 'Threads',
}

const platformIcons: Record<string, string> = {
  INSTAGRAM: '📸',
  FACEBOOK: '📘',
  TIKTOK: '🎵',
  LINKEDIN: '💼',
  GOOGLE_BUSINESS: '📍',
  THREADS: '🧵',
}

const triggerLabels: Record<string, string> = {
  PR_ACHIEVED: 'Nytt PR',
  MILESTONE: 'Milstolpe',
  CHALLENGE_COMPLETE: 'Utmaning avslutad',
  WEEKLY_SUMMARY: 'Veckosammanfattning',
  CLASS_PROMO: 'Klasspromo',
  MANUAL: 'Manuellt',
}

interface SocialMediaManagerProps {
  basePath: string
}

export function SocialMediaManager({ basePath }: SocialMediaManagerProps) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')

  // Create post state
  const [showCreate, setShowCreate] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [aiTopic, setAiTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, accountsRes] = await Promise.all([
        fetch('/api/coach/social/posts'),
        fetch('/api/coach/social/accounts'),
      ])
      if (postsRes.ok) setPosts((await postsRes.json()).posts || [])
      if (accountsRes.ok) setAccounts((await accountsRes.json()).accounts || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const generateCaption = async () => {
    if (!aiTopic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/coach/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, platform: 'instagram' }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewCaption(data.caption)
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const savePost = async (status: string = 'DRAFT') => {
    if (!newCaption.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/coach/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: newCaption,
          isAiGenerated: aiTopic.trim().length > 0,
          status,
        }),
      })
      if (res.ok) {
        setNewCaption('')
        setAiTopic('')
        setShowCreate(false)
        fetchData()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const updatePostStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/coach/social/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      fetchData()
    } catch {
      // ignore
    }
  }

  const filteredPosts = statusFilter === 'all'
    ? posts
    : posts.filter(p => p.status === statusFilter)

  const draftCount = posts.filter(p => p.status === 'DRAFT').length
  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="posts">Inlägg</TabsTrigger>
          <TabsTrigger value="create">Skapa nytt</TabsTrigger>
          <TabsTrigger value="accounts">Konton</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          {draftCount > 0 && (
            <Badge variant="secondary">{draftCount} utkast</Badge>
          )}
        </div>
      </div>

      {/* === POSTS TAB === */}
      <TabsContent value="posts" className="space-y-4">
        {/* Status filter */}
        <div className="flex gap-2">
          {['all', 'DRAFT', 'APPROVED', 'QUEUED', 'PUBLISHED', 'FAILED'].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Alla' : statusConfig[s]?.label || s}
              {s !== 'all' && (
                <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                  {posts.filter(p => p.status === s).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga inlägg{statusFilter !== 'all' ? ' med denna status' : ''}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map(post => {
              const config = statusConfig[post.status] || statusConfig.DRAFT
              return (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
                          {post.isAiGenerated && (
                            <Badge variant="outline" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" /> AI
                            </Badge>
                          )}
                          {post.triggerType && (
                            <Badge variant="secondary" className="text-xs">
                              {triggerLabels[post.triggerType] || post.triggerType}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(post.createdAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-sm whitespace-pre-wrap mb-3">{post.caption}</p>

                        {/* Platform publish status */}
                        {post.publishes.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {post.publishes.map(p => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                {platformIcons[p.account.platform]} {p.account.accountName}
                                {p.status === 'PUBLISHED' && <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />}
                                {p.status === 'FAILED' && <AlertCircle className="h-3 w-3 ml-1 text-red-500" />}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {post.status === 'DRAFT' && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updatePostStatus(post.id, 'APPROVED')}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Godkänn
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 text-red-500" onClick={() => updatePostStatus(post.id, 'FAILED')}>
                                <Trash2 className="h-3 w-3 mr-1" /> Ta bort
                              </Button>
                            </>
                          )}
                          {post.status === 'APPROVED' && (
                            <Button size="sm" className="text-xs h-7" onClick={() => updatePostStatus(post.id, 'QUEUED')}>
                              <Send className="h-3 w-3 mr-1" /> Lägg i kö
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      {/* === CREATE TAB === */}
      <TabsContent value="create" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skapa nytt inlägg</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Generate section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">AI-generera caption</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Beskriv vad du vill posta... (t.ex. 'Marknadsför vår nya HIIT-klass')"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateCaption()}
                />
                <Button onClick={generateCaption} disabled={generating || !aiTopic.trim()}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Generera</>}
                </Button>
              </div>
            </div>

            {/* Caption editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <Textarea
                placeholder="Skriv din caption här..."
                value={newCaption}
                onChange={e => setNewCaption(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">{newCaption.length} tecken</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => savePost('DRAFT')} disabled={saving || !newCaption.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Spara som utkast
              </Button>
              <Button variant="outline" onClick={() => savePost('APPROVED')} disabled={saving || !newCaption.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Godkänn direkt
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* === ACCOUNTS TAB === */}
      <TabsContent value="accounts" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Anslutna konton
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Inga konton anslutna</p>
                <p className="text-xs mt-1">
                  Kontoanslutning via Ayrshare kommer snart.
                  Inlägg skapas som utkast tills konton är anslutna.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{platformIcons[account.platform] || '📱'}</span>
                      <div>
                        <p className="text-sm font-medium">{account.accountName}</p>
                        <p className="text-xs text-muted-foreground">{platformLabels[account.platform] || account.platform}</p>
                      </div>
                    </div>
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
