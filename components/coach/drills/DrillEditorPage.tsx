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
import { Save, Send, Play, Pencil } from 'lucide-react'
import { InteractiveDrillEditor } from './InteractiveDrillEditor'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'
import type { DrillStructure } from './IceHockeyRink'
import { DRILL_SPORT_OPTIONS, type DrillSportType } from '@/remotion/drills/surfaces'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
}

interface DrillEditorPageProps {
  teams: Team[]
}

export function DrillEditorPage({ teams }: DrillEditorPageProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [sportType, setSportType] = useState<DrillSportType>('ICE_HOCKEY')

  const [structure, setStructure] = useState<DrillStructure>({
    players: [],
    movements: [],
    zones: [],
    annotations: [],
  })

  const handleStructureChange = useCallback((s: DrillStructure) => {
    setStructure(s)
    setShowAnimation(false) // switch back to editor when structure changes
  }, [])

  const hasContent = structure.players.length > 0 || structure.movements.length > 0

  const handleSave = async (publish: boolean) => {
    if (!hasContent) {
      toast.error('Lägg till minst en spelare eller rörelse')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/coach/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Övning',
          description,
          teamId: teamId && teamId !== 'none' ? teamId : null,
          sportType,
          structure,
          sourceType: 'MANUAL_EDITOR',
          isPublished: publish,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(publish ? 'Övning publicerad!' : 'Övning sparad!')
      // Reset
      setTitle('')
      setDescription('')
      setTeamId('')
      setStructure({ players: [], movements: [], zones: [], annotations: [] })
      setShowAnimation(false)
    } catch {
      toast.error('Kunde inte spara övningen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Editor card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-blue-500" />
              Rita övning
            </CardTitle>
            {hasContent && structure.movements.length > 0 && (
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
            Placera spelare, rita rörelser och passningar direkt på planen.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sport selector */}
          <div className="flex flex-wrap gap-1.5">
            {DRILL_SPORT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={sportType === opt.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setSportType(opt.value)
                  // Reset structure when switching sports (different coordinate systems)
                  if (opt.value !== sportType && hasContent) {
                    setStructure({ players: [], movements: [], zones: [], annotations: [] })
                    setShowAnimation(false)
                  }
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {showAnimation ? (
            <DrillAnimationPlayer
              title={title || 'Övning'}
              description={description || undefined}
              structure={structure}
              locale="sv"
              sportType={sportType}
            />
          ) : (
            <InteractiveDrillEditor
              initialStructure={structure}
              onChange={handleStructureChange}
              sportType={sportType}
            />
          )}
        </CardContent>
      </Card>

      {/* Details + save (shown when there's content) */}
      {hasContent && (
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
      )}
    </div>
  )
}
