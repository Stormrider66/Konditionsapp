export const TEAM_EVENT_TYPES = [
  'PRACTICE',
  'ICE_PRACTICE',
  'STRENGTH',
  'CARDIO',
  'HYBRID',
  'AGILITY',
  'PREHAB',
  'PLYOMETRICS',
  'GAME',
  'TEST',
  'INTERVAL_SESSION',
  'OFF_DAY',
  'MEETING',
  'ANNUAL_PLAN',
  'OTHER',
] as const

export type TeamEventType = (typeof TEAM_EVENT_TYPES)[number]

export type TeamCalendarLocale = 'en' | 'sv'

export const TEAM_EVENT_TYPE_LABELS: Record<TeamEventType, string> = {
  PRACTICE: 'Ice practice',
  ICE_PRACTICE: 'Ice practice',
  STRENGTH: 'Strength',
  CARDIO: 'Conditioning',
  HYBRID: 'Hybrid',
  AGILITY: 'Agility',
  PREHAB: 'Stability / Prehab',
  PLYOMETRICS: 'Plyometrics',
  GAME: 'Game',
  TEST: 'Test',
  INTERVAL_SESSION: 'Interval session',
  OFF_DAY: 'Rest day',
  MEETING: 'Meeting',
  ANNUAL_PLAN: 'Annual plan',
  OTHER: 'Other',
}

export const TEAM_EVENT_TYPE_LABELS_SV: Record<TeamEventType, string> = {
  PRACTICE: 'Isträning',
  ICE_PRACTICE: 'Isträning',
  STRENGTH: 'Styrka',
  CARDIO: 'Kondition',
  HYBRID: 'Hybrid',
  AGILITY: 'Agility',
  PREHAB: 'Stabilitet / Prehab',
  PLYOMETRICS: 'Plyometri',
  GAME: 'Match',
  TEST: 'Test',
  INTERVAL_SESSION: 'Intervallpass',
  OFF_DAY: 'Vilodag',
  MEETING: 'Möte',
  ANNUAL_PLAN: 'Årshjul',
  OTHER: 'Övrigt',
}

export const TEAM_EVENT_TYPE_COLORS: Record<TeamEventType, string> = {
  PRACTICE: 'bg-blue-500',
  ICE_PRACTICE: 'bg-blue-500',
  STRENGTH: 'bg-slate-700',
  CARDIO: 'bg-orange-500',
  HYBRID: 'bg-emerald-500',
  AGILITY: 'bg-cyan-500',
  PREHAB: 'bg-teal-500',
  PLYOMETRICS: 'bg-fuchsia-500',
  GAME: 'bg-red-500',
  TEST: 'bg-purple-500',
  INTERVAL_SESSION: 'bg-orange-500',
  OFF_DAY: 'bg-green-500',
  MEETING: 'bg-yellow-500',
  ANNUAL_PLAN: 'bg-amber-500',
  OTHER: 'bg-gray-500',
}

export const PHYSICAL_TEAM_EVENT_TYPES: TeamEventType[] = [
  'STRENGTH',
  'CARDIO',
  'HYBRID',
  'AGILITY',
  'PREHAB',
  'PLYOMETRICS',
  'INTERVAL_SESSION',
]

export const TEAM_EVENT_CONTENT_STATUSES = [
  'PLANNED',
  'NEEDS_CONTENT',
  'CONTENT_READY',
  'ASSIGNED',
] as const

export type TeamEventContentStatus = (typeof TEAM_EVENT_CONTENT_STATUSES)[number]

export const TEAM_EVENT_CONTENT_STATUS_LABELS: Record<TeamEventContentStatus, string> = {
  PLANNED: 'Planned framework',
  NEEDS_CONTENT: 'Needs content',
  CONTENT_READY: 'Content ready',
  ASSIGNED: 'Assigned',
}

export const TEAM_EVENT_CONTENT_STATUS_LABELS_SV: Record<TeamEventContentStatus, string> = {
  PLANNED: 'Planerad ram',
  NEEDS_CONTENT: 'Behöver innehåll',
  CONTENT_READY: 'Innehåll klart',
  ASSIGNED: 'Tilldelat',
}

export const TEAM_EVENT_CONTENT_OWNERS = [
  'coach',
  'physical_trainer',
  'physio',
  'shared',
  'self',
] as const

export type TeamEventContentOwner = (typeof TEAM_EVENT_CONTENT_OWNERS)[number]

export const TEAM_EVENT_CONTENT_OWNER_LABELS: Record<TeamEventContentOwner, string> = {
  coach: 'Coaching staff',
  physical_trainer: 'Physical trainer',
  physio: 'Physiotherapist',
  shared: 'Shared responsibility',
  self: 'Own responsibility',
}

export const TEAM_EVENT_CONTENT_OWNER_LABELS_SV: Record<TeamEventContentOwner, string> = {
  coach: 'Tränarstab',
  physical_trainer: 'Fystränare',
  physio: 'Fysioterapeut',
  shared: 'Delat ansvar',
  self: 'Eget ansvar',
}

export function isTeamEventType(value: string): value is TeamEventType {
  return TEAM_EVENT_TYPES.some((type) => type === value)
}

export function teamEventTypeLabel(type: TeamEventType, locale: TeamCalendarLocale = 'en'): string {
  return (locale === 'sv' ? TEAM_EVENT_TYPE_LABELS_SV : TEAM_EVENT_TYPE_LABELS)[type]
}

export function teamEventContentStatusLabel(
  status: TeamEventContentStatus,
  locale: TeamCalendarLocale = 'en'
): string {
  return (locale === 'sv' ? TEAM_EVENT_CONTENT_STATUS_LABELS_SV : TEAM_EVENT_CONTENT_STATUS_LABELS)[status]
}

export function teamEventContentOwnerLabel(
  owner: TeamEventContentOwner,
  locale: TeamCalendarLocale = 'en'
): string {
  return (locale === 'sv' ? TEAM_EVENT_CONTENT_OWNER_LABELS_SV : TEAM_EVENT_CONTENT_OWNER_LABELS)[owner]
}
