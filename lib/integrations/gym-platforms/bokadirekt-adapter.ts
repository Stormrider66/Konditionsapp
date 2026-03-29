/**
 * Boka Direkt Gym Platform Adapter
 *
 * Integrates with Boka Direkt's API for booking management.
 * API access included in premium Boka Direkt plans.
 * Supports webhooks for real-time booking notifications.
 */

import type { GymPlatformAdapter, ConnectionConfig, ExternalClass, ExternalBooking } from './types'

const BOKADIREKT_BASE_URL = 'https://api.bokadirekt.se/v1'

async function bokadirektFetch(path: string, apiKey: string): Promise<Response> {
  return fetch(`${BOKADIREKT_BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })
}

export class BokaDirektAdapter implements GymPlatformAdapter {
  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.apiKey) {
      return {
        success: false,
        error: 'API-nyckel saknas. API-åtkomst ingår i Boka Direkts premiumplan. Hitta din nyckel i affärsinställningarna.',
      }
    }

    try {
      const res = await bokadirektFetch('/business/me', config.apiKey)
      if (res.ok) return { success: true }
      if (res.status === 401) return { success: false, error: 'Ogiltig API-nyckel' }
      return { success: false, error: `Boka Direkt API svarade med status ${res.status}` }
    } catch (err) {
      return { success: false, error: `Kunde inte ansluta till Boka Direkt: ${err}` }
    }
  }

  async fetchClasses(_config: ConnectionConfig, _dateFrom: Date, _dateTo: Date): Promise<ExternalClass[]> {
    // Boka Direkt is primarily a booking platform, not a class scheduler
    // Classes are represented as services/bookable slots
    return []
  }

  async fetchBookings(config: ConnectionConfig, dateFrom: Date, dateTo: Date): Promise<ExternalBooking[]> {
    if (!config.apiKey) return []

    try {
      const fromStr = dateFrom.toISOString().split('T')[0]
      const toStr = dateTo.toISOString().split('T')[0]

      const res = await bokadirektFetch(
        `/bookings?from=${fromStr}&to=${toStr}`,
        config.apiKey,
      )

      if (!res.ok) return []

      const data = await res.json()
      const bookings = Array.isArray(data) ? data : (data.bookings || data.items || data.data || [])

      return bookings.map((b: Record<string, unknown>) => {
        const customer = b.customer as Record<string, unknown> | undefined

        return {
          externalId: String(b.id || b.bookingId || ''),
          type: 'PT_SESSION' as const,
          clientName: customer
            ? String(customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim())
            : String(b.customerName || 'Okänd'),
          clientEmail: customer?.email ? String(customer.email) : null,
          clientExternalId: customer?.id ? String(customer.id) : null,
          className: b.serviceName ? String(b.serviceName) : (b.service ? String(b.service) : null),
          startTime: new Date(b.startTime as string || b.start as string),
          endTime: b.endTime ? new Date(b.endTime as string) : (b.end ? new Date(b.end as string) : null),
          status: mapBokaDirektStatus(String(b.status || 'confirmed')),
        }
      })
    } catch {
      return []
    }
  }
}

function mapBokaDirektStatus(status: string): ExternalBooking['status'] {
  const normalized = status.toLowerCase()
  if (normalized.includes('cancel')) return 'CANCELLED'
  if (normalized.includes('no_show') || normalized.includes('noshow')) return 'NO_SHOW'
  if (normalized.includes('completed') || normalized.includes('done')) return 'CHECKED_IN'
  return 'BOOKED'
}
