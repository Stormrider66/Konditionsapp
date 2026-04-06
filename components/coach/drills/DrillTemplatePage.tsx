'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
          title: title || 'Övning',
          description,
          teamId: teamId && teamId !== 'none' ? teamId : null,
          sportType: selectedTemplate?.sportType || 'ICE_HOCKEY',
          structure,
          sourceType: 'TEMPLATE',
          isPublished: publish,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(publish ? 'Övning publicerad!' : 'Övning sparad!')
      handleBack()
    } catch {
      toast.error('Kunde inte spara övningen')
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
            Övningsmallar
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Välj en färdig mall och anpassa den efter ditt lag.
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
          Tillbaka till mallar
        </Button>
      </div>

      {/* Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Anpassa: {selectedTemplate.name}</CardTitle>
            {structure.movements.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnimation(!showAnimation)}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                {showAnimation ? 'Redigera' : 'Förhandsgranska'}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Dra spelare, lägg till rörelser eller ändra uppställningen.
          </p>
        </CardHeader>
        <CardContent>
          {showAnimation ? (
            <DrillAnimationPlayer
              title={title || 'Övning'}
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
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Övningens namn"
            />
          </div>

          <div className="space-y-2">
            <Label>Beskrivning</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv övningen..."
              rows={3}
            />
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Tilldela till lag</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj lag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget lag</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
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
              Spara utkast
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Publicera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
