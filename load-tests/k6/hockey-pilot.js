import { check, group, sleep } from 'k6'
import { get, postJson, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const BUSINESS_ID = requiredEnv('BUSINESS_ID')
const TEAM_ID = requiredEnv('TEAM_ID')
const BUSINESS_SLUG = __ENV.BUSINESS_SLUG || __ENV.TRAINOMICS_QA_BUSINESS_SLUG || ''
const CLIENT_IDS = (__ENV.CLIENT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
const TARGET_CLIENT_IDS = CLIENT_IDS.length > 0 ? CLIENT_IDS : [CLIENT_ID]

const VUS_WARM = Math.max(1, parseInt(__ENV.HOCKEY_PILOT_WARM_VUS || '10', 10) || 10)
const VUS_STEADY = Math.max(1, parseInt(__ENV.HOCKEY_PILOT_STEADY_VUS || '35', 10) || 35)
const VUS_PEAK = Math.max(1, parseInt(__ENV.HOCKEY_PILOT_PEAK_VUS || '75', 10) || 75)

function nonNegativeFloatEnv(name, fallback) {
  const raw = __ENV[name]
  if (raw == null || raw === '') return fallback
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

const READ_WEIGHT = nonNegativeFloatEnv('HOCKEY_PILOT_READ_WEIGHT', 0.40)
const ATHLETE_WEIGHT = nonNegativeFloatEnv('HOCKEY_PILOT_ATHLETE_WEIGHT', 0.25)
const DASHBOARD_WEIGHT = nonNegativeFloatEnv('HOCKEY_PILOT_DASHBOARD_WEIGHT', 0.20)
const EXPORT_WEIGHT = nonNegativeFloatEnv('HOCKEY_PILOT_EXPORT_WEIGHT', 0.15)

const TEAM_DASHBOARD_DAYS = Math.max(1, Math.min(parseInt(__ENV.TEAM_DASHBOARD_DAYS || '30', 10) || 30, 90))
const EXPORT_PRESET = __ENV.HOCKEY_EXPORT_PRESET || 'aerobic_profile'
const DAILY_METRICS_DAYS = Math.max(1, Math.min(parseInt(__ENV.DAILY_METRICS_DAYS || '30', 10) || 30, 90))
const CALENDAR_MAX_ITEMS_PER_SOURCE = Math.max(
  1,
  Math.min(parseInt(__ENV.CALENDAR_MAX_ITEMS_PER_SOURCE || '150', 10) || 150, 1000)
)
const ATHLETE_AUTH_COOKIE = __ENV.ATHLETE_AUTH_COOKIE || ''
const ATHLETE_BEARER_TOKEN = __ENV.ATHLETE_BEARER_TOKEN || ''
const ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL = __ENV.ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL || ''
const HAS_ATHLETE_AUTH = Boolean(
  ATHLETE_AUTH_COOKIE ||
  ATHLETE_BEARER_TOKEN ||
  ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL
)

if (ATHLETE_WEIGHT > 0 && !HAS_ATHLETE_AUTH) {
  throw new Error(
    'HOCKEY_PILOT_ATHLETE_WEIGHT is enabled, but no athlete auth is configured. Set ATHLETE_AUTH_COOKIE, ATHLETE_BEARER_TOKEN, ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL, or HOCKEY_PILOT_ATHLETE_WEIGHT=0.'
  )
}

function normalizedWeights() {
  const total = READ_WEIGHT + ATHLETE_WEIGHT + DASHBOARD_WEIGHT + EXPORT_WEIGHT
  if (total <= 0) {
    throw new Error(
      'At least one hockey pilot traffic weight must be greater than 0. Check HOCKEY_PILOT_READ_WEIGHT, HOCKEY_PILOT_ATHLETE_WEIGHT, HOCKEY_PILOT_DASHBOARD_WEIGHT, and HOCKEY_PILOT_EXPORT_WEIGHT.'
    )
  }
  return {
    read: READ_WEIGHT / total,
    athlete: ATHLETE_WEIGHT / total,
    dashboard: DASHBOARD_WEIGHT / total,
    exportFlow: EXPORT_WEIGHT / total,
  }
}

function isoStartOfCurrentMonthUtc() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  return d.toISOString()
}

function isoEndOfCurrentMonthUtc() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
  return d.toISOString()
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function businessSlugParam() {
  return BUSINESS_SLUG ? `&businessSlug=${encodeURIComponent(BUSINESS_SLUG)}` : ''
}

function athleteAuthHeaders() {
  const headers = {}
  if (ATHLETE_AUTH_COOKIE) headers.Cookie = ATHLETE_AUTH_COOKIE
  if (ATHLETE_BEARER_TOKEN) headers.Authorization = `Bearer ${ATHLETE_BEARER_TOKEN}`
  if (ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL) headers['x-auth-user-email'] = ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL
  return headers
}

const START_DATE = __ENV.START_DATE || isoStartOfCurrentMonthUtc()
const END_DATE = __ENV.END_DATE || isoEndOfCurrentMonthUtc()
const weights = normalizedWeights()

export const options = {
  scenarios: {
    hockey_pilot_mix: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: VUS_WARM },
        { duration: '6m', target: VUS_STEADY },
        { duration: '4m', target: VUS_PEAK },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.015'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    'endpoint_duration{endpoint:hockey-tests-list}': ['p(95)<1800', 'p(99)<4000'],
    'endpoint_failed{endpoint:hockey-tests-list}': ['rate<0.01'],
    'endpoint_duration{endpoint:hockey-package}': ['p(95)<1500', 'p(99)<3500'],
    'endpoint_failed{endpoint:hockey-package}': ['rate<0.01'],
    'endpoint_duration{endpoint:hockey-athlete-summary}': ['p(95)<1500', 'p(99)<3500'],
    'endpoint_failed{endpoint:hockey-athlete-summary}': ['rate<0.01'],
    'endpoint_duration{endpoint:athlete-calendar}': ['p(95)<1800', 'p(99)<4000'],
    'endpoint_failed{endpoint:athlete-calendar}': ['rate<0.01'],
    'endpoint_duration{endpoint:daily-metrics-get}': ['p(95)<1000', 'p(99)<2500'],
    'endpoint_failed{endpoint:daily-metrics-get}': ['rate<0.01'],
    'endpoint_duration{endpoint:daily-metrics-post}': ['p(95)<1200', 'p(99)<3000'],
    'endpoint_failed{endpoint:daily-metrics-post}': ['rate<0.01'],
    'endpoint_duration{endpoint:business-stats}': ['p(95)<1500', 'p(99)<3500'],
    'endpoint_failed{endpoint:business-stats}': ['rate<0.01'],
    'endpoint_duration{endpoint:team-dashboard}': ['p(95)<1500', 'p(99)<3500'],
    'endpoint_failed{endpoint:team-dashboard}': ['rate<0.01'],
    'endpoint_duration{endpoint:hockey-simca-export}': ['p(95)<3000', 'p(99)<6000'],
    'endpoint_failed{endpoint:hockey-simca-export}': ['rate<0.02'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

function runHockeyReadFlow(clientId) {
  group('hockey-tests-list', () => {
    const res = get(`/api/coach/hockey-tests?teamId=${TEAM_ID}${businessSlugParam()}`, {
      endpoint: 'hockey-tests-list',
    })
    check(res, {
      'hockey tests list status is 200': (r) => r.status === 200,
    })
  })

  group('hockey-package', () => {
    const separator = BUSINESS_SLUG ? '?' : ''
    const path = `/api/teams/${TEAM_ID}/hockey-test-package${separator}${BUSINESS_SLUG ? `businessSlug=${encodeURIComponent(BUSINESS_SLUG)}` : ''}`
    const res = get(path, { endpoint: 'hockey-package' })
    check(res, {
      'hockey package status is 200': (r) => r.status === 200,
    })
  })

  group('hockey-athlete-summary', () => {
    const res = get(`/api/clients/${clientId}/hockey-tests/summary`, {
      endpoint: 'hockey-athlete-summary',
    })
    check(res, {
      'hockey athlete summary status is 200': (r) => r.status === 200,
    })
  })
}

function runAthleteDailyFlow(clientId) {
  const authHeaders = athleteAuthHeaders()

  group('athlete-calendar', () => {
    const res = get(
      `/api/calendar/unified?clientId=${clientId}&startDate=${START_DATE}&endDate=${END_DATE}&includeItems=true&includeGroupedByDate=false&itemsMode=light&maxItemsPerSource=${CALENDAR_MAX_ITEMS_PER_SOURCE}`,
      { endpoint: 'athlete-calendar' },
      authHeaders
    )
    check(res, {
      'athlete calendar status is 200': (r) => r.status === 200,
    })
  })

  group('daily-metrics-read', () => {
    const res = get(`/api/daily-metrics?clientId=${clientId}&days=${DAILY_METRICS_DAYS}`, {
      endpoint: 'daily-metrics-get',
    }, authHeaders)
    check(res, {
      'daily-metrics GET status is 200': (r) => r.status === 200,
    })
  })

  group('daily-metrics-write', () => {
    const res = postJson(
      '/api/daily-metrics',
      {
        clientId,
        date: todayIso(),
        sleepQuality: 7,
        sleepHours: 7.4,
        muscleSoreness: 4,
        energyLevel: 7,
        mood: 7,
        stress: 3,
        injuryPain: 1,
      },
      { endpoint: 'daily-metrics-post' },
      authHeaders
    )
    check(res, {
      'daily-metrics POST status 200/201': (r) => r.status === 200 || r.status === 201,
    })
  })
}

function runDashboardFlow() {
  group('business-stats', () => {
    const res = get(
      `/api/business/${BUSINESS_ID}/stats?includeRecentTests=false&includeMonthlyTrend=false&includeBreakdowns=false&includeSubscriptions=false&shortWindow=true`,
      { endpoint: 'business-stats' }
    )
    check(res, {
      'business-stats status is 200': (r) => r.status === 200,
    })
  })

  group('team-dashboard', () => {
    const res = get(
      `/api/teams/${TEAM_ID}/dashboard?includeMemberStats=false&includeRecentBroadcasts=true&days=${TEAM_DASHBOARD_DAYS}`,
      { endpoint: 'team-dashboard' }
    )
    check(res, {
      'team-dashboard status is 200': (r) => r.status === 200,
    })
  })
}

function runExportFlow() {
  group('hockey-simca-export', () => {
    const separator = BUSINESS_SLUG ? '&' : ''
    const slugQuery = BUSINESS_SLUG ? `${separator}businessSlug=${encodeURIComponent(BUSINESS_SLUG)}` : ''
    const res = get(`/api/teams/${TEAM_ID}/hockey-tests/export?preset=${EXPORT_PRESET}${slugQuery}`, {
      endpoint: 'hockey-simca-export',
    })
    check(res, {
      'hockey export status is 200': (r) => r.status === 200,
    })
  })
}

export default function () {
  const clientId = TARGET_CLIENT_IDS[(__VU + __ITER) % TARGET_CLIENT_IDS.length]
  const roll = Math.random()

  if (roll < weights.read) {
    runHockeyReadFlow(clientId)
  } else if (roll < weights.read + weights.athlete) {
    runAthleteDailyFlow(clientId)
  } else if (roll < weights.read + weights.athlete + weights.dashboard) {
    runDashboardFlow()
  } else {
    runExportFlow()
  }

  sleep(1)
}
