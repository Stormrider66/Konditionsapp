const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  'admin',
  'api',
  'athlete',
  'coach',
  'login',
  'physio',
  'pricing',
  'register',
  'signup',
])

export function getBusinessSlugFromPathname(pathname: string | null): string | null {
  if (!pathname) return null

  const [firstSegment] = pathname.split('/').filter(Boolean)
  if (!firstSegment || RESERVED_TOP_LEVEL_SEGMENTS.has(firstSegment)) {
    return null
  }

  return firstSegment
}

export function getBusinessScopeHeaders(pathname: string | null): HeadersInit | undefined {
  const businessSlug = getBusinessSlugFromPathname(pathname)

  if (!businessSlug) {
    return undefined
  }

  return {
    'x-business-slug': businessSlug,
  }
}
