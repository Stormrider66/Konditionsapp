'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Trophy,
  Plus,
  Users,
  Clock,
  Loader2,
  Calendar,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from '@/i18n/client'

interface CompetitionEntry {
  id: string
  currentValue: number
  rank: number | null
  client: { id: string; name: string }
  lastUpdatedAt: string
}

interface Competition {
  id: string
  name: string
  description: string | null
  type: string
  metric: string
  unit: string | null
  startDate: string
  endDate: string
  isActive: boolean
  imageUrl: string | null
  createdAt: string
  createdBy: { name: string }
  entries: CompetitionEntry[]
  _count: { entries: number }
}

const competitionTypeDefaults = {
  MOST_WORKOUTS: {
    metric: 'typeDefaults.mostWorkouts.metric',
    unit: 'typeDefaults.mostWorkouts.unit',
  },
  TOTAL_VOLUME: {
    metric: 'typeDefaults.totalVolume.metric',
    unit: 'typeDefaults.totalVolume.unit',
  },
  TOTAL_DISTANCE: {
    metric: 'typeDefaults.totalDistance.metric',
    unit: 'typeDefaults.totalDistance.unit',
  },
  WEIGHT_LOSS: {
    metric: 'typeDefaults.weightLoss.metric',
    unit: 'typeDefaults.weightLoss.unit',
  },
  STREAK: {
    metric: 'typeDefaults.streak.metric',
    unit: 'typeDefaults.streak.unit',
  },
  CUSTOM: {
    metric: 'typeDefaults.custom.metric',
    unit: 'typeDefaults.custom.unit',
  },
}

const rankIcons = ['🥇', '🥈', '🥉']

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function daysRemaining(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

interface CompetitionManagerProps {
  basePath: string
}

export function CompetitionManager({ basePath: _basePath }: CompetitionManagerProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const t = useTranslations('components.competitionManager')
  const locale = useLocale()

  // Create form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState('MOST_WORKOUTS')
  const [newMetric, setNewMetric] = useState(t('typeDefaults.mostWorkouts.metric'))
  const [newUnit, setNewUnit] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/competitions')
      if (res.ok) setCompetitions((await res.json()).competitions || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createCompetition = async () => {
    if (!newName.trim() || !newStartDate || !newEndDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/coach/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          type: newType,
          metric: newMetric,
          unit: newUnit || null,
          startDate: newStartDate,
          endDate: newEndDate,
        }),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewName('')
        setNewDescription('')
        setNewStartDate('')
        setNewEndDate('')
        fetchData()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/coach/competitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      fetchData()
    } catch {
      // ignore
    }
  }

  const activeCompetitions = competitions.filter(c => c.isActive && new Date(c.endDate) > new Date())
  const pastCompetitions = competitions.filter(c => !c.isActive || new Date(c.endDate) <= new Date())
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const formatDate = useCallback((value: string) => new Date(value).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
  }), [dateLocale])

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('actions.newChallenge')}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('form.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.name')}</label>
                <Input
                  placeholder={t('form.placeholders.name')}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.type')}</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newType}
                  onChange={e => {
                    setNewType(e.target.value)
                    const defaults = competitionTypeDefaults[e.target.value as keyof typeof competitionTypeDefaults]
                    if (defaults) {
                      setNewMetric(t(defaults.metric))
                      setNewUnit(t(defaults.unit))
                    }
                  }}
                >
                  {Object.keys(competitionTypeDefaults).map(k => (
                    <option key={k} value={k}>{t(`types.${k}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.metric')}</label>
                <Input placeholder={t('form.placeholders.metric')} value={newMetric} onChange={e => setNewMetric(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.unit')}</label>
                <Input placeholder={t('form.placeholders.unit')} value={newUnit} onChange={e => setNewUnit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.startDate')}</label>
                <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('form.labels.endDate')}</label>
                <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('form.labels.description')}</label>
              <Textarea placeholder={t('form.placeholders.description')} value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={createCompetition} disabled={saving || !newName.trim() || !newStartDate || !newEndDate}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
                {saving ? t('actions.saving') : t('actions.create')}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('actions.cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : competitions.length === 0 && !showCreate ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">{t('empty.title')}</p>
          <p className="text-sm mt-1">{t('empty.description')}</p>
        </div>
      ) : (
        <>
          {/* Active competitions */}
          {activeCompetitions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                {t('sections.active')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeCompetitions.map(comp => (
                  <CompetitionDetailCard
                    key={comp.id}
                    competition={comp}
                    onToggle={toggleActive}
                    formatDate={formatDate}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past competitions */}
          {pastCompetitions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                {t('sections.past')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pastCompetitions.map(comp => (
                  <CompetitionDetailCard
                    key={comp.id}
                    competition={comp}
                    onToggle={toggleActive}
                    formatDate={formatDate}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

type CompetitionManagerTranslations = ReturnType<typeof useTranslations>

function CompetitionDetailCard({
  competition: comp,
  onToggle,
  formatDate,
  t,
}: {
  competition: Competition
  onToggle: (id: string, isActive: boolean) => void
  formatDate: (value: string) => string
  t: CompetitionManagerTranslations
}) {
  const days = daysRemaining(comp.endDate)
  const isEnded = new Date(comp.endDate) <= new Date()
  const typeLabel = t(`types.${comp.type}`)

  return (
    <Card className={cn(!comp.isActive && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{comp.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{typeLabel || comp.type}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {t('competition.participants', { count: comp._count.entries })}
              </span>
            </div>
          </div>
          <div className="text-right">
            {isEnded ? (
              <Badge variant="outline" className="text-xs">{t('state.ended')}</Badge>
            ) : (
              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Clock className="h-3 w-3 mr-1" /> {t('competition.daysLeft', { days })}
              </Badge>
            )}
          </div>
        </div>
        {comp.description && (
          <p className="text-xs text-muted-foreground mt-2">{comp.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Leaderboard */}
        {comp.entries.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {comp.entries.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-2 py-1">
                <span className="text-sm w-6 text-center">
                {i < 3 ? rankIcons[i] : `${i + 1}.`}
                </span>
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-semibold">
                  {getInitials(entry.client.name)}
                </div>
                <span className="text-sm flex-1 truncate">{entry.client.name}</span>
                <span className={cn('text-sm font-bold', i === 0 && 'text-yellow-600')}>
                  {entry.currentValue}{comp.unit ? ` ${comp.unit}` : ''}
                </span>
              </div>
            ))}
            {comp._count.entries > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('competition.moreParticipants', { count: comp._count.entries - 5 })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">{t('competition.none')}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(comp.startDate)} — {formatDate(comp.endDate)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => onToggle(comp.id, comp.isActive)}
          >
            {comp.isActive ? t('actions.end') : t('actions.reactivate')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
