/**
 * Calendar Component Types
 */

import { CalendarEventType, CalendarEventStatus, EventImpact, AltitudeAdaptationPhase } from '@prisma/client'

export type UnifiedItemType = 'WORKOUT' | 'RACE' | 'FIELD_TEST' | 'CALENDAR_EVENT' | 'CHECK_IN' | 'WOD' | 'AD_HOC' | 'GARMIN'

export interface UnifiedCalendarItem {
  id: string
  type: UnifiedItemType
  title: string
  description?: string | null
  date: Date | string
  endDate?: Date | string
  status?: string
  metadata: Record<string, unknown>
}

export interface CalendarEvent {
  id: string
  clientId: string
  type: CalendarEventType
  title: string
  description?: string | null
  status: CalendarEventStatus
  startDate: Date | string
  endDate: Date | string
  allDay: boolean
  startTime?: string | null
  endTime?: string | null
  trainingImpact: EventImpact
  impactNotes?: string | null
  altitude?: number | null
  adaptationPhase?: AltitudeAdaptationPhase | null
  seaLevelReturnDate?: Date | string | null
  illnessType?: string | null
  returnToTrainingDate?: Date | string | null
  medicalClearance: boolean
  externalCalendarId?: string | null
  externalCalendarType?: string | null
  externalCalendarName?: string | null
  isReadOnly: boolean
  isRecurring: boolean
  recurrenceRule?: string | null
  color?: string | null
  createdBy?: {
    id: string
    name: string
    role: string
  }
  lastModifiedBy?: {
    id: string
    name: string
    role: string
  } | null
}

export interface DayData {
  date: Date
  items: UnifiedCalendarItem[]
  hasWorkout: boolean
  hasRace: boolean
  hasEvent: boolean
  hasFieldTest: boolean
  hasCheckIn: boolean
  hasWOD: boolean
  hasAdHoc: boolean
  hasGarmin: boolean
  isBlocked: boolean
  isReduced: boolean
  isToday: boolean
  isCurrentMonth: boolean
}

export interface CalendarViewProps {
  clientId: string
  month: Date
  items: UnifiedCalendarItem[]
  onDayClick: (date: Date) => void
  onItemClick: (item: UnifiedCalendarItem) => void
  selectedDate: Date | null
  isLoading?: boolean
}

// Event type display configuration
export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  {
    label: string
    labelSv: string
    color: string
    bgColor: string
    icon: string
  }
> = {
  ALTITUDE_CAMP: {
    label: 'Altitude Camp',
    labelSv: 'Höghöjdsläger',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: '⛰️',
  },
  TRAINING_CAMP: {
    label: 'Training Camp',
    labelSv: 'Träningsläger',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '🏕️',
  },
  TRAVEL: {
    label: 'Travel',
    labelSv: 'Resa',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '✈️',
  },
  ILLNESS: {
    label: 'Illness',
    labelSv: 'Sjukdom',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🤒',
  },
  VACATION: {
    label: 'Vacation',
    labelSv: 'Semester',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '🌴',
  },
  WORK_BLOCKER: {
    label: 'Work',
    labelSv: 'Arbete',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '💼',
  },
  PERSONAL_BLOCKER: {
    label: 'Personal',
    labelSv: 'Privat',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    icon: '🏠',
  },
  EXTERNAL_EVENT: {
    label: 'External Event',
    labelSv: 'Extern händelse',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    icon: '📅',
  },
  SCHEDULED_WORKOUT: {
    label: 'Scheduled Workout',
    labelSv: 'Schemalagt pass',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: '🏋️',
  },
}

// Training impact display configuration
export const IMPACT_CONFIG: Record<
  EventImpact,
  {
    label: string
    labelSv: string
    color: string
    bgColor: string
  }
> = {
  NO_TRAINING: {
    label: 'No Training',
    labelSv: 'Ingen träning',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  REDUCED: {
    label: 'Reduced',
    labelSv: 'Reducerad',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  MODIFIED: {
    label: 'Modified',
    labelSv: 'Anpassad',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  NORMAL: {
    label: 'Normal',
    labelSv: 'Normal',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
}

// Workout type colors for calendar display
export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  RUNNING: 'bg-blue-500',
  STRENGTH: 'bg-amber-500',
  PLYOMETRIC: 'bg-purple-500',
  CORE: 'bg-teal-500',
  RECOVERY: 'bg-green-500',
  CYCLING: 'bg-orange-500',
  SKIING: 'bg-cyan-500',
  SWIMMING: 'bg-sky-500',
  TRIATHLON: 'bg-indigo-500',
  HYROX: 'bg-rose-500',
  ALTERNATIVE: 'bg-gray-500',
  OTHER: 'bg-slate-500',
  WOD: 'bg-emerald-500',
}

// Workout intensity colors
export const INTENSITY_COLORS: Record<string, string> = {
  RECOVERY: 'bg-green-400',
  EASY: 'bg-green-500',
  MODERATE: 'bg-yellow-500',
  THRESHOLD: 'bg-orange-500',
  INTERVAL: 'bg-red-500',
  MAX: 'bg-red-700',
}
