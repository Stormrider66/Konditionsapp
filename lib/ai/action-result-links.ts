export interface ActionResultLink {
  href: string
  label: 'openWorkout' | 'open'
}

interface AiCapabilityActionLike {
  capabilityId?: string
  reviewHref?: string
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolveAppHref(href: string, basePath = ''): string {
  if (!basePath || !href.startsWith('/')) return href
  if (href === basePath || href.startsWith(`${basePath}/`)) return href
  if (href.startsWith('/coach') || href.startsWith('/athlete')) return `${basePath}${href}`
  return href
}

export function getAiCapabilityActionResultLink(
  action: AiCapabilityActionLike,
  executionResponse: unknown,
  basePath = ''
): ActionResultLink | null {
  const response = objectValue(executionResponse)
  const result = objectValue(response?.result)

  const explicitStartPath = stringValue(result?.startPath)
  if (explicitStartPath) {
    return {
      href: resolveAppHref(explicitStartPath, basePath),
      label: action.capabilityId === 'createCardioWorkout' ? 'openWorkout' : 'open',
    }
  }

  const assignmentId = stringValue(result?.assignmentId)
  if (action.capabilityId === 'createCardioWorkout' && assignmentId) {
    return {
      href: resolveAppHref(`/athlete/cardio?start=${encodeURIComponent(assignmentId)}`, basePath),
      label: 'openWorkout',
    }
  }

  if (action.reviewHref) {
    return {
      href: resolveAppHref(action.reviewHref, basePath),
      label: 'open',
    }
  }

  return null
}
