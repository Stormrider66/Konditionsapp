'use client'

import { useState, useCallback } from 'react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Send, Play, ArrowLeft, LayoutTemplate } from 'lucide-react'
import { DrillTemplateLibrary } from './DrillTemplateLibrary'
import { InteractiveDrillEditor } from './InteractiveDrillEditor'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'
import type { DrillStructure } from './IceHockeyRink'
import type { DrillTemplate } from '@/lib/drills/templates'
import type { DrillSportType } from '@/remotion/drills/surfaces'
import { toast } from 'sonner'
import { useTranslations } from '@/i18n/client'

interface Team {
  id: string
  name: string
}

interface DrillTemplatePageProps {
  teams: Team[]
}

export function DrillTemplatePage({ teams }: DrillTemplatePageProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DrillTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [structure, setStructure] = useState<DrillStructure | null>(null)
  const t = useTranslations('components.drillTemplate')

  const handleSelectTemplate = useCallback((template: DrillTemplate) => {
    setSelectedTemplate(template)
    setTitle(template.name)
    setDescription(template.description)
    // Deep copy structure so edits don't mutate the template
    setStructure(JSON.parse(JSON.stringify(template.structure)))
    setShowAnimation(false)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedTemplate(null)
    setStructure(null)
    setTitle('')
    setDescription('')
    setShowAnimation(false)
  }, [])

  const handleSave = async (publish: boolean) => {
    if (!structure) return

    setSaving(true)
    try {
      const res = await fetch('/api/coach/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || t('editor.defaultTitle'),
          description,
          teamId: teamId && teamId !== 'none' ? teamId : null,
          sportType: selectedTemplate?.sportType || 'ICE_HOCKEY',
          structure,
          sourceType: 'TEMPLATE',
          isPublished: publish,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(publish ? t('editor.toasts.publishSuccess') : t('editor.toasts.saveSuccess'))
      handleBack()
    } catch {
      toast.error(t('editor.toasts.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // Template picker view
  if (!selectedTemplate || !structure) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutTemplate className="h-5 w-5 text-orange-500" />
            {t('editor.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('editor.description')}
          </p>
        </CardHeader>
        <CardContent>
          <DrillTemplateLibrary onSelect={handleSelectTemplate} />
        </CardContent>
      </Card>
    )
  }

  // Editor view (customizing a selected template)
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('editor.backToTemplates')}
        </Button>
      </div>

      {/* Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('editor.editTitle', { name: selectedTemplate.name })}
            </CardTitle>
            {structure.movements.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnimation(!showAnimation)}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                {showAnimation ? t('editor.showEdit') : t('editor.showPreview')}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('editor.hint')}
          </p>
        </CardHeader>
        <CardContent>
          {showAnimation ? (
            <DrillAnimationPlayer
              title={title || t('editor.defaultTitle')}
              description={description || undefined}
              structure={structure}
              locale="sv"
              sportType={(selectedTemplate?.sportType as DrillSportType) || 'ICE_HOCKEY'}
            />
          ) : (
            <InteractiveDrillEditor
              initialStructure={structure}
              sportType={(selectedTemplate?.sportType as DrillSportType) || 'ICE_HOCKEY'}
              onChange={(s) => {
                setStructure(s)
                setShowAnimation(false)
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Details + save */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>{t('editor.labels.title')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('editor.placeholders.title')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('editor.labels.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('editor.placeholders.description')}
              rows={3}
            />
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>{t('editor.labels.assignToTeam')}</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('editor.selectTeamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('editor.noTeam')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {t('editor.saveDraft')}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {t('editor.publish')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
