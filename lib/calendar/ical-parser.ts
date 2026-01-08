/**
 * iCal Parser
 *
 * Parses iCalendar (.ics) files and converts events to our CalendarEvent format.
 * Supports VEVENT components with common properties.
 *
 * iCal specification: RFC 5545
 */

import { addDays, parse, parseISO, isValid } from 'date-fns'

export interface ParsedICalEvent {
  uid: string
  summary: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  location?: string
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
  recurrence?: string // RRULE if recurring
  lastModified?: Date
  created?: Date
  organizer?: string
  attendees?: string[]
  categories?: string[]
  url?: string
}

export interface ICalParseResult {
  success: boolean
  events: ParsedICalEvent[]
  calendarName?: string
  calendarDescription?: string
  timezone?: string
  errors: string[]
}

/**
 * Parse an iCal string (.ics content)
 */
export function parseICalString(icalContent: string): ICalParseResult {
  const result: ICalParseResult = {
    success: false,
    events: [],
    errors: [],
  }

  try {
    // Normalize line endings and unfold lines (RFC 5545 Section 3.1)
    const normalizedContent = unfoldLines(icalContent)
    const lines = normalizedContent.split('\n').map((l) => l.trim())

    // Validate it's an iCalendar file
    if (!lines.includes('BEGIN:VCALENDAR')) {
      result.errors.push('Invalid iCal format: missing BEGIN:VCALENDAR')
      return result
    }

    // Extract calendar properties
    result.calendarName = extractProperty(lines, 'X-WR-CALNAME')
    result.calendarDescription = extractProperty(lines, 'X-WR-CALDESC')
    result.timezone = extractProperty(lines, 'X-WR-TIMEZONE')

    // Find all VEVENT blocks
    const eventBlocks = extractBlocks(lines, 'VEVENT')

    for (const eventLines of eventBlocks) {
      try {
        const event = parseVEvent(eventLines)
        if (event) {
          result.events.push(event)
        }
      } catch (err) {
        result.errors.push(`Failed to parse event: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    result.success = result.events.length > 0 || result.errors.length === 0
  } catch (err) {
    result.errors.push(`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return result
}

/**
 * Unfold long lines per RFC 5545 Section 3.1
 * Lines that start with a space or tab are continuations
 */
function unfoldLines(content: string): string {
  // Normalize line endings to \n
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Unfold lines (continuation lines start with space or tab)
    .replace(/\n[ \t]/g, '')
}

/**
 * Extract a property value from lines
 */
function extractProperty(lines: string[], propertyName: string): string | undefined {
  const line = lines.find((l) => l.startsWith(`${propertyName}:`))
  if (!line) return undefined
  return unescapeValue(line.substring(propertyName.length + 1))
}

/**
 * Extract all blocks of a given type (e.g., VEVENT)
 */
function extractBlocks(lines: string[], blockType: string): string[][] {
  const blocks: string[][] = []
  let currentBlock: string[] = []
  let inBlock = false

  for (const line of lines) {
    if (line === `BEGIN:${blockType}`) {
      inBlock = true
      currentBlock = []
    } else if (line === `END:${blockType}`) {
      if (inBlock) {
        blocks.push(currentBlock)
      }
      inBlock = false
    } else if (inBlock) {
      currentBlock.push(line)
    }
  }

  return blocks
}

/**
 * Parse a VEVENT block into a ParsedICalEvent
 */
function parseVEvent(lines: string[]): ParsedICalEvent | null {
  const uid = extractProperty(lines, 'UID')
  const summary = extractProperty(lines, 'SUMMARY')

  if (!uid || !summary) {
    return null
  }

  // Parse dates
  const dtstart = findDateProperty(lines, 'DTSTART')
  const dtend = findDateProperty(lines, 'DTEND')
  const duration = extractProperty(lines, 'DURATION')

  if (!dtstart) {
    return null
  }

  // Determine if all-day event
  const dtstartLine = lines.find((l) => l.startsWith('DTSTART'))
  const allDay = !!(dtstartLine?.includes('VALUE=DATE') ||
                 (dtstartLine && /DTSTART[:;]/.test(dtstartLine) && !dtstartLine.includes('T')))

  // Calculate end date
  let endDate: Date
  if (dtend) {
    endDate = dtend
  } else if (duration) {
    endDate = addDuration(dtstart, duration)
  } else {
    // Default to same day for all-day events, or 1 hour for timed events
    endDate = allDay ? addDays(dtstart, 1) : new Date(dtstart.getTime() + 60 * 60 * 1000)
  }

  // For all-day events, the end date is exclusive in iCal, so we subtract one day
  if (allDay && dtend) {
    endDate = addDays(endDate, -1)
  }

  // Parse status
  const statusStr = extractProperty(lines, 'STATUS')
  let status: ParsedICalEvent['status']
  if (statusStr === 'TENTATIVE' || statusStr === 'CONFIRMED' || statusStr === 'CANCELLED') {
    status = statusStr
  }

  // Parse attendees
  const attendees: string[] = []
  for (const line of lines) {
    if (line.startsWith('ATTENDEE')) {
      const match = line.match(/ATTENDEE[^:]*:(.+)/)
      if (match) {
        attendees.push(match[1].replace('mailto:', ''))
      }
    }
  }

  // Parse categories
  const categoriesStr = extractProperty(lines, 'CATEGORIES')
  const categories = categoriesStr?.split(',').map((c) => c.trim())

  return {
    uid,
    summary,
    description: extractProperty(lines, 'DESCRIPTION'),
    startDate: dtstart,
    endDate,
    allDay,
    location: extractProperty(lines, 'LOCATION'),
    status,
    recurrence: extractProperty(lines, 'RRULE'),
    lastModified: findDateProperty(lines, 'LAST-MODIFIED'),
    created: findDateProperty(lines, 'CREATED'),
    organizer: extractProperty(lines, 'ORGANIZER')?.replace('mailto:', ''),
    attendees: attendees.length > 0 ? attendees : undefined,
    categories,
    url: extractProperty(lines, 'URL'),
  }
}

/**
 * Find and parse a date property (handles various formats)
 */
function findDateProperty(lines: string[], propertyName: string): Date | undefined {
  const line = lines.find((l) => l.startsWith(propertyName))
  if (!line) return undefined

  // Extract the value after the last colon
  const colonIndex = line.lastIndexOf(':')
  if (colonIndex === -1) return undefined

  const value = line.substring(colonIndex + 1).trim()
  return parseICalDate(value)
}

/**
 * Parse an iCal date string
 * Formats: YYYYMMDD, YYYYMMDDTHHmmss, YYYYMMDDTHHmmssZ
 */
function parseICalDate(value: string): Date | undefined {
  if (!value) return undefined

  // Remove trailing Z (UTC indicator)
  const isUtc = value.endsWith('Z')
  const cleanValue = value.replace('Z', '')

  let date: Date | undefined

  if (cleanValue.length === 8) {
    // YYYYMMDD format (all-day)
    const year = parseInt(cleanValue.substring(0, 4))
    const month = parseInt(cleanValue.substring(4, 6)) - 1
    const day = parseInt(cleanValue.substring(6, 8))
    date = new Date(year, month, day)
  } else if (cleanValue.length === 15 && cleanValue.includes('T')) {
    // YYYYMMDDTHHmmss format
    const year = parseInt(cleanValue.substring(0, 4))
    const month = parseInt(cleanValue.substring(4, 6)) - 1
    const day = parseInt(cleanValue.substring(6, 8))
    const hour = parseInt(cleanValue.substring(9, 11))
    const minute = parseInt(cleanValue.substring(11, 13))
    const second = parseInt(cleanValue.substring(13, 15))

    if (isUtc) {
      date = new Date(Date.UTC(year, month, day, hour, minute, second))
    } else {
      date = new Date(year, month, day, hour, minute, second)
    }
  }

  return date && isValid(date) ? date : undefined
}

/**
 * Add an iCal duration to a date
 * Format: P[n]D or PT[n]H[n]M[n]S
 */
function addDuration(date: Date, duration: string): Date {
  const result = new Date(date)

  // Parse days
  const daysMatch = duration.match(/(\d+)D/)
  if (daysMatch) {
    result.setDate(result.getDate() + parseInt(daysMatch[1]))
  }

  // Parse hours
  const hoursMatch = duration.match(/(\d+)H/)
  if (hoursMatch) {
    result.setHours(result.getHours() + parseInt(hoursMatch[1]))
  }

  // Parse minutes
  const minutesMatch = duration.match(/(\d+)M/)
  if (minutesMatch && duration.includes('T')) {
    // Only after T to distinguish from months
    result.setMinutes(result.getMinutes() + parseInt(minutesMatch[1]))
  }

  // Parse seconds
  const secondsMatch = duration.match(/(\d+)S/)
  if (secondsMatch) {
    result.setSeconds(result.getSeconds() + parseInt(secondsMatch[1]))
  }

  return result
}

/**
 * Unescape iCal text values
 */
function unescapeValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * Fetch and parse an iCal URL
 */
export async function fetchAndParseICalUrl(url: string): Promise<ICalParseResult> {
  const MAX_ICAL_BYTES = 2 * 1024 * 1024 // 2MB
  const TIMEOUT_MS = 10_000
  const MAX_REDIRECTS = 3

  const errorResult = (message: string): ICalParseResult => ({
    success: false,
    events: [],
    errors: [message],
  })

  try {
    const initialUrl = normalizeWebcalUrl(url)
    const validationError = validateExternalFetchUrl(initialUrl)
    if (validationError) {
      return errorResult(validationError)
    }

    // Fetch with manual redirects so we can validate each redirect target (SSRF mitigation)
    let currentUrl = initialUrl
    let response: Response | null = null

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        response = await fetch(currentUrl, {
          headers: {
            Accept: 'text/calendar',
          },
          redirect: 'manual',
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break

        const nextUrl = normalizeWebcalUrl(new URL(location, currentUrl).toString())
        const nextValidationError = validateExternalFetchUrl(nextUrl)
        if (nextValidationError) {
          return errorResult(`Unsafe redirect blocked: ${nextValidationError}`)
        }

        currentUrl = nextUrl
        continue
      }

      // Non-redirect response
      break
    }

    if (!response) {
      return errorResult('Failed to fetch calendar: no response')
    }

    if (!response.ok) {
      return {
        success: false,
        events: [],
        errors: [`Failed to fetch calendar: ${response.status} ${response.statusText}`],
      }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const size = Number(contentLength)
      if (Number.isFinite(size) && size > MAX_ICAL_BYTES) {
        return errorResult('Calendar file too large')
      }
    }

    const content = await response.text()
    const bytes = new TextEncoder().encode(content).length
    if (bytes > MAX_ICAL_BYTES) {
      return errorResult('Calendar file too large')
    }
    return parseICalString(content)
  } catch (err) {
    return {
      success: false,
      events: [],
      errors: [`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`],
    }
  }
}

function normalizeWebcalUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.toLowerCase().startsWith('webcal://')) {
    // Many iCal subscription links use "webcal://", which is effectively HTTPS.
    return `https://${trimmed.slice('webcal://'.length)}`
  }
  return trimmed
}

/**
 * Basic URL validation for server-side fetches (SSRF mitigation).
 * This is not perfect, but blocks the highest-risk targets (localhost/private IPs).
 */
function validateExternalFetchUrl(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return 'Invalid calendar URL'
  }

  if (u.username || u.password) {
    return 'Calendar URL must not include credentials'
  }

  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return 'Only http/https calendar URLs are allowed'
  }

  const hostname = u.hostname.toLowerCase()

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return 'Localhost calendar URLs are not allowed'
  }

  if (hostname.endsWith('.local')) {
    return 'Local network calendar URLs are not allowed'
  }

  if (isPrivateIpLiteral(hostname)) {
    return 'Private network calendar URLs are not allowed'
  }

  return null
}

function isPrivateIpLiteral(hostname: string): boolean {
  // IPv6 literal
  if (hostname.includes(':')) {
    const h = hostname
    if (h === '::' || h === '::1') return true
    if (h.startsWith('fe80:')) return true // link-local
    if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local
    return false
  }

  // IPv4 literal
  const parts = hostname.split('.')
  if (parts.length !== 4) return false
  const nums = parts.map((p) => (p.match(/^\d+$/) ? Number(p) : NaN))
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false

  const [a, b] = nums

  // 0.0.0.0/8
  if (a === 0) return true
  // 10.0.0.0/8
  if (a === 10) return true
  // 127.0.0.0/8
  if (a === 127) return true
  // 169.254.0.0/16 (link-local, incl. cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true
  // 100.64.0.0/10 (carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true

  return false
}

/**
 * Convert parsed iCal events to our CalendarEvent format
 */
export function convertToCalendarEvents(
  events: ParsedICalEvent[],
  options: {
    clientId: string
    calendarName: string
    calendarType: string
    defaultImpact?: 'NO_TRAINING' | 'REDUCED' | 'MODIFIED' | 'NORMAL'
    color?: string
  }
): Array<{
  externalCalendarId: string
  externalCalendarType: string
  externalCalendarName: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  allDay: boolean
  trainingImpact: string
  isReadOnly: boolean
  color: string | null
  status: string
}> {
  return events
    .filter((event) => event.status !== 'CANCELLED')
    .map((event) => ({
      externalCalendarId: event.uid,
      externalCalendarType: options.calendarType,
      externalCalendarName: options.calendarName,
      title: event.summary,
      description: event.description || null,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay,
      trainingImpact: options.defaultImpact || 'NORMAL',
      isReadOnly: true,
      color: options.color || null,
      status: event.status === 'TENTATIVE' ? 'SCHEDULED' : 'SCHEDULED',
    }))
}

/**
 * Detect the type of external calendar URL
 */
export function detectCalendarType(url: string): 'GOOGLE' | 'OUTLOOK' | 'APPLE' | 'ICAL_URL' {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('calendar.google.com') || lowerUrl.includes('googleapis.com')) {
    return 'GOOGLE'
  }
  if (lowerUrl.includes('outlook.office365.com') || lowerUrl.includes('outlook.live.com')) {
    return 'OUTLOOK'
  }
  if (lowerUrl.includes('caldav.icloud.com') || lowerUrl.includes('p.icloud.com')) {
    return 'APPLE'
  }

  return 'ICAL_URL'
}
