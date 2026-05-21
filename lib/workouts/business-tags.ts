const BUSINESS_TAG_PREFIX = '__business:'

export function getWorkoutBusinessTag(businessId: string): string {
  return `${BUSINESS_TAG_PREFIX}${businessId}`
}

export function isWorkoutBusinessTag(tag: string): boolean {
  return tag.startsWith(BUSINESS_TAG_PREFIX)
}

export function visibleWorkoutTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => !isWorkoutBusinessTag(tag))
}

export function normalizeWorkoutTags(
  inputTags: unknown,
  businessId?: string,
  existingTags: string[] = []
): string[] {
  const visibleTags = Array.isArray(inputTags)
    ? inputTags.filter((tag): tag is string => typeof tag === 'string' && !isWorkoutBusinessTag(tag))
    : []
  const hiddenTags = existingTags.filter(isWorkoutBusinessTag)
  const nextTags = [...visibleTags, ...hiddenTags]

  if (businessId) {
    nextTags.push(getWorkoutBusinessTag(businessId))
  }

  return Array.from(new Set(nextTags))
}
