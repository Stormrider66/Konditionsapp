'use client'

/**
 * Event Form Dialog
 *
 * Dialog for creating and editing calendar events (travel, camps, illness, vacation, etc.)
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { UnifiedCalendarItem, EVENT_TYPE_CONFIG, IMPACT_CONFIG } from './types'
import { CalendarEventType, EventImpact } from '@prisma/client'
import { IllnessProtocolPreview } from './IllnessProtocolPreview'
import { AltitudeCampPreview } from './AltitudeCampPreview'
import { TrainingCampPreview } from './TrainingCampPreview'
import type { CampType, CampFocus } from '@/lib/calendar/training-camp'
import { useLocale } from '@/i18n/client'

interface EventFormDialogProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  event: UnifiedCalendarItem | null // null = creating new, otherwise editing
  onSaved: () => void
}

export function EventFormDialog({
  clientId,
  open,
  onOpenChange,
  date,
  event,
  onSaved,
}: EventFormDialogProps) {
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<CalendarEventType>('TRAVEL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState<Date>(date)
  const [endDate, setEndDate] = useState<Date>(date)
  const [trainingImpact, setTrainingImpact] = useState<EventImpact>('NO_TRAINING')
  const [impactNotes, setImpactNotes] = useState('')

  // Altitude-specific
  const [altitude, setAltitude] = useState<number | ''>('')

  // Training camp-specific
  const [campType, setCampType] = useState<CampType>('MIXED')
  const [campFocus, setCampFocus] = useState<CampFocus>('MIXED')
  const [sessionsPerDay, setSessionsPerDay] = useState<number>(2)

  // Illness-specific
  const [illnessType, setIllnessType] = useState('')
  const [returnToTrainingDate, setReturnToTrainingDate] = useState<Date | undefined>()
  const [medicalClearance, setMedicalClearance] = useState(false)
  const [hadFever, setHadFever] = useState(false)
  const [feverDays, setFeverDays] = useState<number>(0)
  const [symptomsBelowNeck, setSymptomsBelowNeck] = useState(false)

  // Initialize form when dialog opens or event changes
  useEffect(() => {
    if (event && event.type === 'CALENDAR_EVENT') {
      const meta = event.metadata
      setType((meta.eventType as CalendarEventType) || 'TRAVEL')
      setTitle(event.title)
      setDescription(event.description || '')
      setStartDate(new Date(event.date))
      setEndDate(event.endDate ? new Date(event.endDate) : new Date(event.date))
      setTrainingImpact((meta.trainingImpact as EventImpact) || 'NO_TRAINING')
      setImpactNotes((meta.impactNotes as string) || '')
      setAltitude((meta.altitude as number) || '')
      setIllnessType((meta.illnessType as string) || '')
      setReturnToTrainingDate(
        meta.returnToTrainingDate ? new Date(meta.returnToTrainingDate as string) : undefined
      )
      setMedicalClearance((meta.medicalClearance as boolean) || false)
      setHadFever((meta.hadFever as boolean) || false)
      setFeverDays((meta.feverDays as number) || 0)
      setSymptomsBelowNeck((meta.symptomsBelowNeck as boolean) || false)
    } else {
      // Reset to defaults for new event
      setType('TRAVEL')
      setTitle('')
      setDescription('')
      setStartDate(date)
      setEndDate(date)
      setTrainingImpact('NO_TRAINING')
      setImpactNotes('')
      setAltitude('')
      setCampType('MIXED')
      setCampFocus('MIXED')
      setSessionsPerDay(2)
      setIllnessType('')
      setReturnToTrainingDate(undefined)
      setMedicalClearance(false)
      setHadFever(false)
      setFeverDays(0)
      setSymptomsBelowNeck(false)
    }
    setError(null)
  }, [event, date, open])

  // Auto-set title based on type if empty
  useEffect(() => {
    if (!title) {
      const config = EVENT_TYPE_CONFIG[type]
      if (config) {
        setTitle(appLocale === 'sv' ? config.labelSv : config.label)
      }
    }
  }, [appLocale, type, title])

  // Auto-adjust training impact based on type
  useEffect(() => {
    switch (type) {
      case 'TRAVEL':
      case 'ILLNESS':
        setTrainingImpact('NO_TRAINING')
        break
      case 'VACATION':
        setTrainingImpact('NO_TRAINING')
        break
      case 'ALTITUDE_CAMP':
      case 'TRAINING_CAMP':
        setTrainingImpact('MODIFIED')
        break
      case 'WORK_BLOCKER':
      case 'PERSONAL_BLOCKER':
        setTrainingImpact('NO_TRAINING')
        break
    }
  }, [type])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(appLocale === 'sv' ? 'Titel krävs' : 'Title is required')
      return
    }

    if (endDate < startDate) {
      setError(appLocale === 'sv' ? 'Slutdatum kan inte vara före startdatum' : 'End date cannot be before start date')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        clientId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        trainingImpact,
        impactNotes: impactNotes.trim() || null,
        altitude: type === 'ALTITUDE_CAMP' && altitude ? Number(altitude) : null,
        illnessType: type === 'ILLNESS' ? illnessType : null,
        returnToTrainingDate:
          type === 'ILLNESS' && returnToTrainingDate
            ? returnToTrainingDate.toISOString()
            : null,
        medicalClearance: type === 'ILLNESS' ? medicalClearance : false,
      }

      const url = event
        ? `/api/calendar-events/${event.id}`
        : '/api/calendar-events'
      const method = event ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || (appLocale === 'sv' ? 'Kunde inte spara händelsen' : 'Could not save the event'))
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : appLocale === 'sv' ? 'Ett fel uppstod' : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = !!event

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? appLocale === 'sv' ? 'Redigera händelse' : 'Edit event'
              : appLocale === 'sv' ? 'Ny kalenderhändelse' : 'New calendar event'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? appLocale === 'sv' ? 'Uppdatera information om händelsen' : 'Update event information'
              : appLocale === 'sv' ? 'Lägg till en händelse som påverkar träningen (resa, semester, sjukdom, etc.)' : 'Add an event that affects training (travel, vacation, illness, etc.)'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Event Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">{appLocale === 'sv' ? 'Typ av händelse' : 'Event type'}</Label>
            <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
              <SelectTrigger>
                <SelectValue placeholder={appLocale === 'sv' ? 'Välj typ' : 'Choose type'} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{appLocale === 'sv' ? config.labelSv : config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">{appLocale === 'sv' ? 'Titel' : 'Title'}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={appLocale === 'sv' ? 't.ex. Semester i Spanien' : 'e.g. Vacation in Spain'}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{appLocale === 'sv' ? 'Startdatum' : 'Start date'}</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'd MMM yyyy', { locale: dateLocale }) : appLocale === 'sv' ? 'Välj datum' : 'Choose date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) {
                        setStartDate(d)
                        if (d > endDate) setEndDate(d)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>{appLocale === 'sv' ? 'Slutdatum' : 'End date'}</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'd MMM yyyy', { locale: dateLocale }) : appLocale === 'sv' ? 'Välj datum' : 'Choose date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    disabled={(d) => d < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Training Impact */}
          <div className="grid gap-2">
            <Label htmlFor="impact">{appLocale === 'sv' ? 'Träningspåverkan' : 'Training impact'}</Label>
            <Select
              value={trainingImpact}
              onValueChange={(v) => setTrainingImpact(v as EventImpact)}
            >
              <SelectTrigger>
                <SelectValue placeholder={appLocale === 'sv' ? 'Välj påverkan' : 'Choose impact'} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMPACT_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className={config.color}>{appLocale === 'sv' ? config.labelSv : config.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact Notes */}
          {trainingImpact !== 'NORMAL' && trainingImpact !== 'NO_TRAINING' && (
            <div className="grid gap-2">
              <Label htmlFor="impactNotes">{appLocale === 'sv' ? 'Anpassningsdetaljer' : 'Adjustment details'}</Label>
              <Input
                id="impactNotes"
                value={impactNotes}
                onChange={(e) => setImpactNotes(e.target.value)}
                placeholder={appLocale === 'sv' ? 't.ex. Endast morgonpass möjliga' : 'e.g. Morning sessions only'}
              />
            </div>
          )}

          {/* Altitude-specific fields */}
          {type === 'ALTITUDE_CAMP' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="altitude">{appLocale === 'sv' ? 'Höjd (meter)' : 'Altitude (meters)'}</Label>
                <Input
                  id="altitude"
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value ? Number(e.target.value) : '')}
                  placeholder={appLocale === 'sv' ? 't.ex. 2000' : 'e.g. 2000'}
                  min={0}
                  max={5000}
                />
                <p className="text-xs text-muted-foreground">
                  {appLocale === 'sv'
                    ? 'Intensitet anpassas automatiskt baserat på höjd och anpassningsfas'
                    : 'Intensity is adjusted automatically based on altitude and adaptation phase'}
                </p>
              </div>

              {/* Altitude Camp Preview */}
              {altitude && Number(altitude) >= 1500 && (
                <AltitudeCampPreview
                  altitude={Number(altitude)}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </>
          )}

          {/* Training Camp-specific fields */}
          {type === 'TRAINING_CAMP' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="campType">{appLocale === 'sv' ? 'Lägertyp' : 'Camp type'}</Label>
                  <Select value={campType} onValueChange={(v) => setCampType(v as CampType)}>
                    <SelectTrigger>
                      <SelectValue placeholder={appLocale === 'sv' ? 'Välj typ' : 'Choose type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENDURANCE">{appLocale === 'sv' ? 'Distansläger' : 'Endurance camp'}</SelectItem>
                      <SelectItem value="SPEED">{appLocale === 'sv' ? 'Fartläger' : 'Speed camp'}</SelectItem>
                      <SelectItem value="MIXED">{appLocale === 'sv' ? 'Blandläger' : 'Mixed camp'}</SelectItem>
                      <SelectItem value="RECOVERY">{appLocale === 'sv' ? 'Återhämtningsläger' : 'Recovery camp'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="campFocus">{appLocale === 'sv' ? 'Fokus' : 'Focus'}</Label>
                  <Select value={campFocus} onValueChange={(v) => setCampFocus(v as CampFocus)}>
                    <SelectTrigger>
                      <SelectValue placeholder={appLocale === 'sv' ? 'Välj fokus' : 'Choose focus'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VOLUME">{appLocale === 'sv' ? 'Volym' : 'Volume'}</SelectItem>
                      <SelectItem value="INTENSITY">{appLocale === 'sv' ? 'Intensitet' : 'Intensity'}</SelectItem>
                      <SelectItem value="TECHNIQUE">{appLocale === 'sv' ? 'Teknik' : 'Technique'}</SelectItem>
                      <SelectItem value="MIXED">{appLocale === 'sv' ? 'Blandat' : 'Mixed'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sessionsPerDay">{appLocale === 'sv' ? 'Pass per dag' : 'Sessions per day'}</Label>
                <Select
                  value={String(sessionsPerDay)}
                  onValueChange={(v) => setSessionsPerDay(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={appLocale === 'sv' ? 'Välj antal' : 'Choose number'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{appLocale === 'sv' ? '1 pass' : '1 session'}</SelectItem>
                    <SelectItem value="2">{appLocale === 'sv' ? '2 pass' : '2 sessions'}</SelectItem>
                    <SelectItem value="3">{appLocale === 'sv' ? '3 pass' : '3 sessions'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Training Camp Preview */}
              <TrainingCampPreview
                startDate={startDate}
                endDate={endDate}
                campType={campType}
                campFocus={campFocus}
                sessionsPerDay={sessionsPerDay}
              />
            </>
          )}

          {/* Illness-specific fields */}
          {type === 'ILLNESS' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="illnessType">{appLocale === 'sv' ? 'Typ av sjukdom' : 'Illness type'}</Label>
                <Select value={illnessType} onValueChange={setIllnessType}>
                  <SelectTrigger>
                    <SelectValue placeholder={appLocale === 'sv' ? 'Välj typ' : 'Choose type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESPIRATORY">{appLocale === 'sv' ? 'Luftvägar (förkylning, hosta)' : 'Respiratory (cold, cough)'}</SelectItem>
                    <SelectItem value="GI">{appLocale === 'sv' ? 'Magbesvär' : 'GI symptoms'}</SelectItem>
                    <SelectItem value="FEVER">{appLocale === 'sv' ? 'Feber' : 'Fever'}</SelectItem>
                    <SelectItem value="GENERAL">{appLocale === 'sv' ? 'Allmän sjukdom' : 'General illness'}</SelectItem>
                    <SelectItem value="OTHER">{appLocale === 'sv' ? 'Annat' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fever tracking */}
              <div className="flex items-center justify-between">
                <Label htmlFor="hadFever" className="flex-1">
                  {appLocale === 'sv' ? 'Har/hade feber (>38°C)' : 'Has/had fever (>38°C)'}
                </Label>
                <Switch
                  id="hadFever"
                  checked={hadFever}
                  onCheckedChange={setHadFever}
                />
              </div>

              {hadFever && (
                <div className="grid gap-2">
                  <Label htmlFor="feverDays">{appLocale === 'sv' ? 'Antal dagar med feber' : 'Days with fever'}</Label>
                  <Input
                    id="feverDays"
                    type="number"
                    value={feverDays || ''}
                    onChange={(e) => setFeverDays(e.target.value ? Number(e.target.value) : 0)}
                    placeholder={appLocale === 'sv' ? 't.ex. 2' : 'e.g. 2'}
                    min={1}
                    max={14}
                  />
                </div>
              )}

              {/* Symptoms location */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="symptomsBelowNeck">{appLocale === 'sv' ? 'Symtom under halsen' : 'Symptoms below the neck'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {appLocale === 'sv'
                      ? 'Bröstträngsel, andningsbesvär, muskel-/ledvärk'
                      : 'Chest congestion, breathing difficulty, muscle/joint pain'}
                  </p>
                </div>
                <Switch
                  id="symptomsBelowNeck"
                  checked={symptomsBelowNeck}
                  onCheckedChange={setSymptomsBelowNeck}
                />
              </div>

              <div className="grid gap-2">
                <Label>{appLocale === 'sv' ? 'Beräknad återgång till träning' : 'Estimated return to training'}</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !returnToTrainingDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnToTrainingDate
                        ? format(returnToTrainingDate, 'd MMM yyyy', { locale: dateLocale })
                        : appLocale === 'sv' ? 'Välj datum' : 'Choose date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={returnToTrainingDate}
                      onSelect={setReturnToTrainingDate}
                      disabled={(d) => d < endDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="medicalClearance" className="flex-1">
                  {appLocale === 'sv' ? 'Läkargodkännande för återgång' : 'Medical clearance to return'}
                </Label>
                <Switch
                  id="medicalClearance"
                  checked={medicalClearance}
                  onCheckedChange={setMedicalClearance}
                />
              </div>

              {/* Protocol Preview */}
              {illnessType && (
                <IllnessProtocolPreview
                  illnessType={illnessType}
                  startDate={startDate}
                  endDate={endDate}
                  hadFever={hadFever}
                  feverDays={feverDays}
                  symptomsBelowNeck={symptomsBelowNeck}
                />
              )}
            </>
          )}

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">{appLocale === 'sv' ? 'Beskrivning (valfritt)' : 'Description (optional)'}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={appLocale === 'sv' ? 'Ytterligare information...' : 'Additional information...'}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {appLocale === 'sv' ? 'Avbryt' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing
              ? appLocale === 'sv' ? 'Spara ändringar' : 'Save changes'
              : appLocale === 'sv' ? 'Skapa händelse' : 'Create event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
