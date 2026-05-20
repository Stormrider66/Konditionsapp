/**
 * BRP/Wondr Gym Platform Adapter
 *
 * Integrates with BRP Systems (Wondr) API.
 * Used by major Swedish gym chains (SATS, Nordic Wellness, etc.)
 * API docs: brpsystems.atlassian.net/wiki/spaces/API/
 *
 * NOTE: Requires partner agreement with BRP Systems.
 * Contact BRP for API credentials.
 */

import type { GymPlatformAdapter, ConnectionConfig, ExternalClass, ExternalBooking } from './types'

const BRP_BASE_URL = 'https://api.brpsystems.com/v1'

async function brpFetch(path: string, config: ConnectionConfig): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  if (config.apiKey && config.apiSecret) {
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  } else if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  return fetch(`${BRP_BASE_URL}${path}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
}

export class BrpAdapter implements GymPlatformAdapter {
  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.apiKey) {
      return {
        success: false,
        error: 'BRP/Wondr requires a partner agreement. Contact BRP Systems at brpsystems.com for API access.',
      }
    }

    try {
      const res = await brpFetch('/facilities', config)
      if (res.ok) return { success: true }
      if (res.status === 401) return { success: false, error: 'Invalid API credentials' }
      return { success: false, error: `BRP API responded with status ${res.status}` }
    } catch (err) {
      return { success: false, error: `Could not connect to BRP: ${err}` }
    }
  }

  async fetchClasses(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalClass[]> {
    if (!config.apiKey) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      const res = await brpFetch(
        `/groupactivities?startDate=${fromStr}&endDate=${toStr}${config.siteId ? `&facilityId=${config.siteId}` : ''}`,
        config,
      )

      if (!res.ok) return []

      const data = await res.json()
      const activities = Array.isArray(data) ? data : (data.items || data.data || [])

      return activities.map((a: Record<string, unknown>) => ({
        externalId: String(a.id || ''),
        name: String(a.name || a.title || ''),
        instructor: a.instructorName ? String(a.instructorName) : null,
        startTime: new Date(a.startTime as string || a.start as string),
        endTime: new Date(a.endTime as string || a.end as string),
        location: a.roomName ? String(a.roomName) : (a.location ? String(a.location) : null),
        maxCapacity: typeof a.maxCapacity === 'number' ? a.maxCapacity : null,
        bookedCount: typeof a.bookedCount === 'number' ? a.bookedCount : null,
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

      const res = await brpFetch(
        `/bookings?startDate=${fromStr}&endDate=${toStr}${config.siteId ? `&facilityId=${config.siteId}` : ''}`,
        config,
      )

      if (!res.ok) return []

      const data = await res.json()
      const bookings = Array.isArray(data) ? data : (data.items || data.data || [])

      return bookings.map((b: Record<string, unknown>) => ({
        externalId: String(b.id || b.bookingId || ''),
        type: 'CLASS' as const,
        clientName: String(b.memberName || b.clientName || 'Okänd'),
        clientEmail: b.email ? String(b.email) : null,
        clientExternalId: b.memberId ? String(b.memberId) : null,
        className: b.activityName ? String(b.activityName) : null,
        startTime: new Date(b.startTime as string || b.start as string),
        endTime: b.endTime ? new Date(b.endTime as string) : null,
        status: 'BOOKED' as const,
      }))
    } catch {
      return []
    }
  }
}
