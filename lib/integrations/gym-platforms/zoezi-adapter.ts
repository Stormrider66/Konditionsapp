/**
 * Zoezi Gym Platform Adapter
 *
 * Integrates with the Zoezi REST API for class schedules and bookings.
 * API docs: developer.zoezi.se
 * Auth: API key in Authorization header
 */

import type { GymPlatformAdapter, ConnectionConfig, ExternalClass, ExternalBooking } from './types'

const ZOEZI_BASE_URL = 'https://api.zoezi.se/api/v1'

async function zoeziFetch(path: string, apiKey: string): Promise<Response> {
  const res = await fetch(`${ZOEZI_BASE_URL}${path}`, {
    headers: {
      'Authorization': apiKey,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })
  return res
}

export class ZoeziAdapter implements GymPlatformAdapter {
  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.apiKey) {
      return { success: false, error: 'API-nyckel saknas. Registrera dig på developer.zoezi.se' }
    }

    try {
      const res = await zoeziFetch('/facility', config.apiKey)
      if (res.ok) {
        return { success: true }
      }
      return { success: false, error: `Zoezi API svarade med status ${res.status}` }
    } catch (err) {
      return { success: false, error: `Kunde inte ansluta till Zoezi: ${err}` }
    }
  }

  async fetchClasses(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalClass[]> {
    if (!config.apiKey) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      const res = await zoeziFetch(
        `/groupactivities?from=${fromStr}&to=${toStr}`,
        config.apiKey,
      )

      if (!res.ok) return []

      const data = await res.json()
      const activities = Array.isArray(data) ? data : (data.items || data.data || [])

      return activities.map((a: Record<string, unknown>) => ({
        externalId: String(a.id || a.activityId || ''),
        name: String(a.name || a.title || 'Okänd klass'),
        instructor: a.instructor ? String((a.instructor as Record<string, unknown>)?.name || a.instructor) : null,
        startTime: new Date(a.startTime as string || a.start as string),
        endTime: new Date(a.endTime as string || a.end as string),
        location: a.location ? String(a.location) : null,
        maxCapacity: typeof a.maxParticipants === 'number' ? a.maxParticipants : null,
        bookedCount: typeof a.bookedCount === 'number' ? a.bookedCount : (typeof a.participants === 'number' ? a.participants : null),
        description: a.description ? String(a.description) : null,
      }))
    } catch {
      return []
    }
  }

  async fetchBookings(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalBooking[]> {
    if (!config.apiKey) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      const res = await zoeziFetch(
        `/bookings?from=${fromStr}&to=${toStr}`,
        config.apiKey,
      )

      if (!res.ok) return []

      const data = await res.json()
      const bookings = Array.isArray(data) ? data : (data.items || data.data || [])

      return bookings.map((b: Record<string, unknown>) => {
        const client = b.client as Record<string, unknown> | undefined
        const member = b.member as Record<string, unknown> | undefined
        const person = client || member

        return {
          externalId: String(b.id || b.bookingId || ''),
          type: (b.type === 'PT' || b.type === 'PERSONAL_TRAINING') ? 'PT_SESSION' as const :
                (b.type === 'DROP_IN') ? 'DROP_IN' as const : 'CLASS' as const,
          clientName: person ? String(person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()) : String(b.clientName || 'Okänd'),
          clientEmail: person ? (person.email ? String(person.email) : null) : null,
          clientExternalId: person ? String(person.id || person.memberId || '') : null,
          className: b.activityName ? String(b.activityName) : (b.name ? String(b.name) : null),
          startTime: new Date(b.startTime as string || b.start as string),
          endTime: b.endTime ? new Date(b.endTime as string) : (b.end ? new Date(b.end as string) : null),
          status: mapZoeziStatus(String(b.status || 'BOOKED')),
        }
      })
    } catch {
      return []
    }
  }
}

function mapZoeziStatus(status: string): ExternalBooking['status'] {
  const normalized = status.toUpperCase()
  if (normalized.includes('CHECK') || normalized.includes('ATTENDED')) return 'CHECKED_IN'
  if (normalized.includes('CANCEL')) return 'CANCELLED'
  if (normalized.includes('NO_SHOW') || normalized.includes('NOSHOW')) return 'NO_SHOW'
  return 'BOOKED'
}
