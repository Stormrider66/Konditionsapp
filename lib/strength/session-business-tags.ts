import {
  getWorkoutBusinessTag,
  isWorkoutBusinessTag,
  normalizeWorkoutTags,
  visibleWorkoutTags,
} from '@/lib/workouts/business-tags'

export function getStrengthBusinessTag(businessId: string): string {
  return getWorkoutBusinessTag(businessId)
}

export function isStrengthBusinessTag(tag: string): boolean {
  return isWorkoutBusinessTag(tag)
}

export function visibleStrengthSessionTags(tags: string[] | null | undefined): string[] {
  return visibleWorkoutTags(tags)
}

export function normalizeStrengthSessionTags(
  inputTags: unknown,
  businessId?: string,
  existingTags: string[] = []
): string[] {
  return normalizeWorkoutTags(inputTags, businessId, existingTags)
}
