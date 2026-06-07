const BUSINESS_TAG_PREFIX = '__business:'
const ATHLETE_TAG_PREFIX = '__athlete:'

export function getWorkoutBusinessTag(businessId: string): string {
  return `${BUSINESS_TAG_PREFIX}${businessId}`
}

export function isWorkoutBusinessTag(tag: string): boolean {
  return tag.startsWith(BUSINESS_TAG_PREFIX)
}

export function getWorkoutAthleteTag(athleteId: string): string {
  return `${ATHLETE_TAG_PREFIX}${athleteId}`
}

export function isWorkoutAthleteTag(tag: string): boolean {
  return tag.startsWith(ATHLETE_TAG_PREFIX)
}

export function getWorkoutAthleteIdFromTag(tag: string): string | null {
  if (!isWorkoutAthleteTag(tag)) return null
  const athleteId = tag.slice(ATHLETE_TAG_PREFIX.length).trim()
  return athleteId || null
}

export function getWorkoutAthleteIdFromTags(tags: string[] | null | undefined): string | null {
  const athleteTag = (tags ?? []).find(isWorkoutAthleteTag)
  return athleteTag ? getWorkoutAthleteIdFromTag(athleteTag) : null
}

export function setWorkoutAthleteTag(
  tags: string[] | null | undefined,
  athleteId: string | null | undefined
): string[] {
  const nextTags = (tags ?? []).filter((tag) => !isWorkoutAthleteTag(tag))
  if (athleteId) {
    nextTags.push(getWorkoutAthleteTag(athleteId))
  }
  return Array.from(new Set(nextTags))
}

export function isWorkoutHiddenTag(tag: string): boolean {
  return isWorkoutBusinessTag(tag) || isWorkoutAthleteTag(tag)
}

export function visibleWorkoutTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => !isWorkoutHiddenTag(tag))
}

export function normalizeWorkoutTags(
  inputTags: unknown,
  businessId?: string,
  existingTags: string[] = []
): string[] {
  const input = Array.isArray(inputTags)
    ? inputTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  const visibleTags = input.filter((tag) => !isWorkoutHiddenTag(tag))
  const athleteTags = input.filter(isWorkoutAthleteTag)
  const businessTags = existingTags.filter(isWorkoutBusinessTag)
  const nextTags = [...visibleTags, ...athleteTags, ...businessTags]

  if (businessId) {
    nextTags.push(getWorkoutBusinessTag(businessId))
  }

  return Array.from(new Set(nextTags))
}
