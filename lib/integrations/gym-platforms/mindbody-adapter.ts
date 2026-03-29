/**
 * MindBody Gym Platform Adapter
 *
 * Integrates with MindBody's Public API v6.
 * API docs: developers.mindbodyonline.com
 * Auth: Source credentials + site activation codes
 * Free tier: < 5,000 API calls per billing cycle
 */

import type { GymPlatformAdapter, ConnectionConfig, ExternalClass, ExternalBooking } from './types'

const MINDBODY_BASE_URL = 'https://api.mindbodyonline.com/public/v6'

async function mindbodyFetch(path: string, config: ConnectionConfig): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Api-Key': config.apiKey || '',
  }

  if (config.siteId) {
    headers['SiteId'] = config.siteId
  }

  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  return fetch(`${MINDBODY_BASE_URL}${path}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
}

export class MindBodyAdapter implements GymPlatformAdapter {
  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.apiKey) {
      return {
        success: false,
        error: 'API-nyckel saknas. Skapa ett gratis konto på developers.mindbodyonline.com',
      }
    }

    if (!config.siteId) {
      return {
        success: false,
        error: 'Site ID saknas. Ange ditt MindBody Site ID (finns i affärsinställningarna).',
      }
    }

    try {
      const res = await mindbodyFetch('/site/sites', config)
      if (res.ok) return { success: true }
      if (res.status === 401) return { success: false, error: 'Ogiltiga API-uppgifter eller saknad site-aktivering' }
      return { success: false, error: `MindBody API svarade med status ${res.status}` }
    } catch (err) {
      return { success: false, error: `Kunde inte ansluta till MindBody: ${err}` }
    }
  }

  async fetchClasses(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalClass[]> {
    if (!config.apiKey || !config.siteId) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      const res = await mindbodyFetch(
        `/class/classes?StartDateTime=${fromStr}&EndDateTime=${toStr}`,
        config,
      )

      if (!res.ok) return []

      const data = await res.json()
      const classes = data.Classes || data.classes || []

      return classes.map((c: Record<string, unknown>) => {
        const staff = c.Staff as Record<string, unknown> | undefined
        const location = c.Location as Record<string, unknown> | undefined
        const classDescription = c.ClassDescription as Record<string, unknown> | undefined

        return {
          externalId: String(c.Id || c.ClassId || ''),
          name: classDescription ? String(classDescription.Name || '') : String(c.ClassName || c.Name || ''),
          instructor: staff ? String(staff.Name || `${staff.FirstName || ''} ${staff.LastName || ''}`.trim()) : null,
          startTime: new Date(c.StartDateTime as string),
          endTime: new Date(c.EndDateTime as string),
          location: location ? String(location.Name || '') : null,
          maxCapacity: typeof c.MaxCapacity === 'number' ? c.MaxCapacity : null,
          bookedCount: typeof c.TotalBooked === 'number' ? c.TotalBooked : null,
          description: classDescription?.Description ? String(classDescription.Description) : null,
        }
      })
    } catch {
      return []
    }
  }

  async fetchBookings(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalBooking[]> {
    if (!config.apiKey || !config.siteId) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      // Fetch appointments (PT sessions)
      const res = await mindbodyFetch(
        `/appointment/appointments?StartDate=${fromStr}&EndDate=${toStr}`,
        config,
      )

      if (!res.ok) return []

      const data = await res.json()
      const appointments = data.Appointments || data.appointments || []

      return appointments.map((a: Record<string, unknown>) => {
        const client = (a.Client || a.client) as Record<string, unknown> | undefined
        const sessionType = a.SessionType as Record<string, unknown> | undefined

        return {
          externalId: String(a.Id || a.AppointmentId || ''),
          type: 'PT_SESSION' as const,
          clientName: client
            ? String(client.Name || `${client.FirstName || ''} ${client.LastName || ''}`.trim())
            : 'Okänd',
          clientEmail: client?.Email ? String(client.Email) : null,
          clientExternalId: client?.Id ? String(client.Id) : null,
          className: sessionType ? String(sessionType.Name || '') : null,
          startTime: new Date(a.StartDateTime as string),
          endTime: a.EndDateTime ? new Date(a.EndDateTime as string) : null,
          status: mapMindBodyStatus(String(a.Status || 'Booked')),
        }
      })
    } catch {
      return []
    }
  }
}

function mapMindBodyStatus(status: string): ExternalBooking['status'] {
  const normalized = status.toLowerCase()
  if (normalized.includes('completed') || normalized.includes('arrived')) return 'CHECKED_IN'
  if (normalized.includes('cancelled') || normalized.includes('canceled')) return 'CANCELLED'
  if (normalized.includes('no show') || normalized.includes('absent')) return 'NO_SHOW'
  return 'BOOKED'
}
