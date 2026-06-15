export interface UnifiedCalendarItem {
  id: string
  type:
    | 'WORKOUT'
    | 'RACE'
    | 'FIELD_TEST'
    | 'CALENDAR_EVENT'
    | 'CHECK_IN'
    | 'WOD'
    | 'AD_HOC'
    | 'GARMIN'
    | 'QUICK_ERG'
  title: string
  description?: string | null
  date: Date
  endDate?: Date
  status?: string
  metadata: Record<string, unknown>
}

export type CalendarItemsMode = 'full' | 'light'

export interface BuildUnifiedCalendarPayloadInput {
  cacheKey: string
  dbUserId: string
  clientId: string
  startDate: Date
  endDate: Date
  includeWorkouts: boolean
  includeRaces: boolean
  includeFieldTests: boolean
  includeEvents: boolean
  includeCheckIns: boolean
  includeWODs: boolean
  includeAdHoc: boolean
  includeQuickErg: boolean
  includeItems: boolean
  itemsMode: CalendarItemsMode
  includeGroupedByDate: boolean
  maxItemsPerSource: number
  rangeClamped: boolean
  maxRangeDays: number
}
