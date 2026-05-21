const BUSINESS_TAG_PREFIX = '__business:'

export function getStrengthBusinessTag(businessId: string): string {
  return `${BUSINESS_TAG_PREFIX}${businessId}`
}

export function isStrengthBusinessTag(tag: string): boolean {
  return tag.startsWith(BUSINESS_TAG_PREFIX)
}

export function visibleStrengthSessionTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => !isStrengthBusinessTag(tag))
}

export function normalizeStrengthSessionTags(
  inputTags: unknown,
  businessId?: string,
  existingTags: string[] = []
): string[] {
  const visibleTags = Array.isArray(inputTags)
    ? inputTags.filter((tag): tag is string => typeof tag === 'string' && !isStrengthBusinessTag(tag))
    : []
  const hiddenTags = existingTags.filter(isStrengthBusinessTag)
  const nextTags = [...visibleTags, ...hiddenTags]

  if (businessId) {
    nextTags.push(getStrengthBusinessTag(businessId))
  }

  return Array.from(new Set(nextTags))
}
