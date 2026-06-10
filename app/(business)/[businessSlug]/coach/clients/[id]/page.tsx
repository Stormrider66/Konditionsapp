// app/(business)/[businessSlug]/coach/clients/[id]/page.tsx
//
// Server orchestrator for the coach athlete profile. Loads all six datasets
// in parallel by calling the existing API routes with the caller's cookies
// forwarded — the routes keep sole ownership of auth/business scoping — and
// seeds the client view, eliminating the old fetch-on-mount waterfall.
import { headers } from 'next/headers'
import { ClientDetailView, type InitialProfileData } from '@/components/coach/athlete-profile/ClientDetailView'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

interface ApiEnvelope {
  success?: boolean
  data?: unknown
  counts?: unknown
  teamPlan?: unknown
  error?: string
}

async function fetchJson(
  baseUrl: string,
  forwardedHeaders: Record<string, string>,
  path: string,
  extraHeaders: Record<string, string> = {}
): Promise<ApiEnvelope | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { ...forwardedHeaders, ...extraHeaders },
      cache: 'no-store',
    })
    return (await response.json()) as ApiEnvelope
  } catch (error) {
    console.error(`Athlete profile server fetch failed for ${path}:`, error)
    return null
  }
}

export default async function BusinessClientDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params

  const requestHeaders = await headers()
  const host = requestHeaders.get('host') ?? 'localhost:3000'
  const proto = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const baseUrl = `${proto}://${host}`
  const forwardedHeaders: Record<string, string> = {}
  const cookie = requestHeaders.get('cookie')
  if (cookie) forwardedHeaders.cookie = cookie
  const acceptLanguage = requestHeaders.get('accept-language')
  if (acceptLanguage) forwardedHeaders['accept-language'] = acceptLanguage
  // Local load-test bypass auth arrives as headers, not cookies (see lib/load-test-bypass.ts)
  const loadTestSecret = requestHeaders.get('x-load-test-secret')
  if (loadTestSecret) forwardedHeaders['x-load-test-secret'] = loadTestSecret
  const loadTestEmail = requestHeaders.get('x-auth-user-email')
  if (loadTestEmail) forwardedHeaders['x-auth-user-email'] = loadTestEmail

  const [clientRes, programsRes, sportProfileRes, recentTestsRes, athletePlansRes, teamPlanRes] = await Promise.all([
    fetchJson(baseUrl, forwardedHeaders, `/api/clients/${id}?businessSlug=${encodeURIComponent(businessSlug)}`, {
      'x-business-slug': businessSlug,
    }),
    fetchJson(baseUrl, forwardedHeaders, `/api/programs?clientId=${id}`),
    fetchJson(baseUrl, forwardedHeaders, `/api/sport-profile/${id}`),
    fetchJson(baseUrl, forwardedHeaders, `/api/clients/${id}/recent-tests`),
    fetchJson(baseUrl, forwardedHeaders, `/api/clients/${id}/athlete-plans?active=true`),
    fetchJson(baseUrl, forwardedHeaders, `/api/clients/${id}/team-plan`),
  ])

  const initial = {
    client: clientRes?.success ? clientRes.data : null,
    error: clientRes?.success ? null : clientRes?.error ?? (clientRes ? 'Failed to fetch client' : 'Network error'),
    programs: programsRes?.success ? programsRes.data ?? [] : [],
    sportProfile: sportProfileRes?.success && sportProfileRes.data ? sportProfileRes.data : null,
    recentTests: recentTestsRes?.success ? recentTestsRes.data ?? [] : [],
    recentTestCounts: recentTestsRes?.success
      ? recentTestsRes.counts ?? { test: 0, hockey: 0, custom: 0 }
      : { test: 0, hockey: 0, custom: 0 },
    athletePlans: athletePlansRes?.success ? athletePlansRes.data ?? [] : [],
    teamPlan: teamPlanRes?.success ? teamPlanRes.teamPlan ?? null : null,
  } as InitialProfileData

  return <ClientDetailView id={id} businessSlug={businessSlug} initial={initial} />
}
