'use client'

import { useState, useRef } from 'react'
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
import { Camera, Upload, Loader2, Save, Send, Sparkles, Play, Pencil, MessageSquare } from 'lucide-react'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'
import { InteractiveDrillEditor } from './InteractiveDrillEditor'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
}

interface DrillCreatorProps {
  teams: Team[]
  businessSlug?: string
}

export function DrillCreator({ teams, businessSlug }: DrillCreatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [structure, setStructure] = useState<DrillStructure | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [editorMode, setEditorMode] = useState(false)
  const [textPrompt, setTextPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Convert to base64 for AI
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    setAnalyzing(true)
    try {
      const res = await fetch('/api/coach/drills/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analys misslyckades')
      }

      const result = await res.json()
      setTitle(result.title)
      setDescription(result.description)
      setStructure(result.structure)
      toast.success('Övningen analyserad!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte analysera bilden')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTextGenerate = async () => {
    if (!textPrompt.trim() || textPrompt.trim().length < 5) {
      toast.error('Beskriv övningen med minst några ord')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/coach/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt.trim(),
          sportType: 'ICE_HOCKEY',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generering misslyckades')
      }

      const result = await res.json()
      setTitle(result.title)
      setDescription(result.description)
      setStructure(result.structure)
      toast.success('Övning genererad!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte generera övning')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (publish: boolean) => {
    if (!structure) {
      toast.error('Ingen övning att spara')
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
          sportType: 'ICE_HOCKEY',
          structure,
          sourceType: previewImage ? 'CLIPBOARD_PHOTO' : editorMode ? 'MANUAL_EDITOR' : textPrompt ? 'AI_TEXT' : 'MANUAL',
          sourceImageUrl,
          isPublished: publish,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(publish ? 'Övning publicerad!' : 'Övning sparad!')
      // Reset form
      setTitle('')
      setDescription('')
      setStructure(null)
      setPreviewImage(null)
      setTeamId('')
      setEditorMode(false)
      setShowAnimation(false)
      setTextPrompt('')
      setGenerating(false)
    } catch {
      toast.error('Kunde inte spara övningen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Skapa övning från foto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ta ett foto av din taktiktavla eller clipboard. AI analyserar bilden och skapar en digital övning.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
            >
              <Camera className="h-4 w-4 mr-2" />
              Ta foto
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture')
                  fileInputRef.current.click()
                  fileInputRef.current.setAttribute('capture', 'environment')
                }
              }}
              disabled={analyzing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Välj bild
            </Button>
          </div>

          {analyzing && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analyserar taktiktavla...</span>
            </div>
          )}

          {/* Preview of uploaded image */}
          {previewImage && !analyzing && (
            <div className="relative rounded-lg overflow-hidden border max-h-48">
              <img src={previewImage} alt="Clipboard" className="w-full h-48 object-contain bg-muted" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text-to-drill */}
      {!structure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-green-500" />
              Beskriv övning med text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Beskriv övningen i fritext. AI genererar ett övningsdiagram automatiskt.
            </p>

            <Textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="T.ex. 'Breakout-övning för 5 spelare. Back hämtar puck bakom eget mål, passning till center som skickar vidare till wingen...'"
              rows={3}
              disabled={generating}
            />

            <Button
              onClick={handleTextGenerate}
              disabled={generating || textPrompt.trim().length < 5}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genererar övning...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generera övning
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual editor */}
      {!editorMode && !structure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-blue-500" />
              Rita övning manuellt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Placera spelare, rita rörelser och passningar direkt på rinken.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEditorMode(true)
                setStructure({ players: [], movements: [], zones: [], annotations: [] })
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Öppna redigerare
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interactive editor */}
      {editorMode && structure && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Redigerare</CardTitle>
              <div className="flex items-center gap-2">
                {structure.movements?.length > 0 && (
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
            </div>
          </CardHeader>
          <CardContent>
            {showAnimation ? (
              <DrillAnimationPlayer
                title={title || 'Övning'}
                description={description || undefined}
                structure={structure}
                locale="sv"
              />
            ) : (
              <InteractiveDrillEditor
                initialStructure={structure}
                onChange={(s) => setStructure(s)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Drill details (shown after analysis or manual creation) */}
      {structure && (
        <>
          {/* Rink visualization (only for AI-analyzed drills, editor has its own) */}
          {!editorMode && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Övningsdiagram</CardTitle>
                  {structure.movements?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnimation(!showAnimation)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      {showAnimation ? 'Visa diagram' : 'Animera'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showAnimation ? (
                  <DrillAnimationPlayer
                    title={title || 'Övning'}
                    description={description || undefined}
                    structure={structure}
                    locale="sv"
                  />
                ) : (
                  <IceHockeyRink structure={structure} className="mx-auto" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Edit details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Övningens namn" />
              </div>

              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beskriv övningen..." rows={3} />
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
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex-1">
                  <Save className="h-4 w-4 mr-1.5" />
                  Spara utkast
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving} className="flex-1">
                  <Send className="h-4 w-4 mr-1.5" />
                  Publicera
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
