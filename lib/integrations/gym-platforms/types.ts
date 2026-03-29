/**
 * Gym Platform Integration — Shared Types
 *
 * Abstract interface for gym management platform adapters.
 * Each platform (Zoezi, Wondr/BRP, Boka Direkt, MindBody) implements
 * this interface, allowing the sync engine to work with any platform.
 */

export type GymProvider = 'ZOEZI' | 'WONDR' | 'BOKADIREKT' | 'MINDBODY'

export interface ConnectionConfig {
  provider: GymProvider
  apiKey?: string
  apiSecret?: string
  siteId?: string
  accessToken?: string
  refreshToken?: string
}

export interface ExternalClass {
  externalId: string
  name: string
  instructor: string | null
  startTime: Date
  endTime: Date
  location: string | null
  maxCapacity: number | null
  bookedCount: number | null
  description: string | null
}

export interface ExternalBooking {
  externalId: string
  type: 'CLASS' | 'PT_SESSION' | 'DROP_IN'
  clientName: string
  clientEmail: string | null
  clientExternalId: string | null
  className: string | null
  startTime: Date
  endTime: Date | null
  status: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW'
}

export interface WorkoutAssignment {
  id: string
  clientName: string
  clientEmail: string | null
  workoutName: string
  startTime: Date
  endTime: Date
  coachName: string
  notes: string | null
}

export interface GymPlatformAdapter {
  /** Test if the connection credentials are valid */
  testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }>

  /** Fetch classes for a given date range */
  fetchClasses(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalClass[]>

  /** Fetch bookings for a given date range */
  fetchBookings(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalBooking[]>

  /** Push a workout assignment to the external platform (two-way sync) */
  pushWorkoutAssignment?(config: ConnectionConfig, assignment: WorkoutAssignment): Promise<string | null>
}

export interface SyncResult {
  classesImported: number
  classesUpdated: number
  bookingsImported: number
  bookingsUpdated: number
  errors: string[]
}

export const PROVIDER_LABELS: Record<GymProvider, string> = {
  ZOEZI: 'Zoezi',
  WONDR: 'Wondr (BRP)',
  BOKADIREKT: 'Boka Direkt',
  MINDBODY: 'MindBody',
}

export const PROVIDER_SETUP_DOCS: Record<GymProvider, string> = {
  ZOEZI: 'Registrera dig som utvecklare på developer.zoezi.se för att få en API-nyckel.',
  WONDR: 'Kontakta BRP Systems för att bli partner och få API-åtkomst.',
  BOKADIREKT: 'API-åtkomst ingår i Boka Direkts premiumplaner. Hitta din API-nyckel i affärsinställningarna.',
  MINDBODY: 'Skapa ett gratis utvecklarkonto på developers.mindbodyonline.com. Under 5 000 API-anrop/cykel är gratis.',
}
