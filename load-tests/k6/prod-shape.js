import { check, group, sleep } from 'k6'
import { get, postJson, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const BUSINESS_ID = requiredEnv('BUSINESS_ID')
const TEAM_ID = requiredEnv('TEAM_ID')
const CLIENT_IDS = (__ENV.CLIENT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
const TARGET_CLIENT_IDS = CLIENT_IDS.length > 0 ? CLIENT_IDS : [CLIENT_ID]

const VUS_WARM = Math.max(10, parseInt(__ENV.PROD_SHAPE_WARM_VUS || '75', 10) || 75)
const VUS_STEADY = Math.max(10, parseInt(__ENV.PROD_SHAPE_STEADY_VUS || '200', 10) || 200)
const VUS_PEAK = Math.max(10, parseInt(__ENV.PROD_SHAPE_PEAK_VUS || '350', 10) || 350)

const READ_WEIGHT = Math.max(0, parseFloat(__ENV.PROD_SHAPE_READ_WEIGHT || '0.75') || 0.75)
const WRITE_WEIGHT = Math.max(0, parseFloat(__ENV.PROD_SHAPE_WRITE_WEIGHT || '0.15') || 0.15)
const DASHBOARD_WEIGHT = Math.max(0, parseFloat(__ENV.PROD_SHAPE_DASHBOARD_WEIGHT || '0.10') || 0.10)

const DAILY_METRICS_DAYS = Math.max(1, Math.min(parseInt(__ENV.DAILY_METRICS_DAYS || '30', 10) || 30, 90))
const CALENDAR_MAX_ITEMS_PER_SOURCE = Math.max(
  1,
  Math.min(parseInt(__ENV.CALENDAR_MAX_ITEMS_PER_SOURCE || '150', 10) || 150, 1000)
)
const TEAM_DASHBOARD_DAYS = Math.max(1, Math.min(parseInt(__ENV.TEAM_DASHBOARD_DAYS || '30', 10) || 30, 90))

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

const START_DATE = __ENV.START_DATE || isoStartOfCurrentMonthUtc()
const END_DATE = __ENV.END_DATE || isoEndOfCurrentMonthUtc()

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function normalizedWeights() {
  const total = READ_WEIGHT + WRITE_WEIGHT + DASHBOARD_WEIGHT
  if (total <= 0) {
    return { read: 0.75, write: 0.15, dashboard: 0.10 }
  }
  return {
    read: READ_WEIGHT / total,
    write: WRITE_WEIGHT / total,
    dashboard: DASHBOARD_WEIGHT / total,
  }
}

const weights = normalizedWeights()

export const options = {
  scenarios: {
    prod_shape_mix: {
      executor: 'ramping-vus',
      stages: [
        { duration: '4m', target: VUS_WARM },
        { duration: '8m', target: VUS_STEADY },
        { duration: '6m', target: VUS_PEAK },
        { duration: '4m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<2500', 'p(99)<5000'],
    'endpoint_duration{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:calendar-unified}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_duration{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:daily-metrics-get}': ['rate<1.1'],
    'endpoint_duration{endpoint:daily-metrics-post}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:daily-metrics-post}': ['rate<1.1'],
    'endpoint_duration{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:business-stats}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:business-stats}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:business-stats}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:business-stats}': ['rate>=0'],
    'endpoint_duration{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:team-dashboard}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:team-dashboard}': ['rate>=0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

function runReadFlow(clientId) {
  group('calendar-unified', () => {
    const res = get(
      `/api/calendar/unified?clientId=${clientId}&startDate=${START_DATE}&endDate=${END_DATE}&includeItems=true&includeGroupedByDate=false&itemsMode=light&maxItemsPerSource=${CALENDAR_MAX_ITEMS_PER_SOURCE}`,
      { endpoint: 'calendar-unified' }
    )
    check(res, {
      'calendar status is 200': (r) => r.status === 200,
    })
  })

  group('daily-metrics-read', () => {
    const res = get(`/api/daily-metrics?clientId=${clientId}&days=${DAILY_METRICS_DAYS}`, {
      endpoint: 'daily-metrics-get',
    })
    check(res, {
      'daily-metrics GET status is 200': (r) => r.status === 200,
    })
  })
}

function runWriteFlow(clientId) {
  group('daily-metrics-write', () => {
    const res = postJson(
      '/api/daily-metrics',
      {
        clientId,
        date: todayIso(),
        sleepQuality: 7,
        sleepHours: 7.2,
        muscleSoreness: 3,
        energyLevel: 7,
        mood: 7,
        stress: 3,
        injuryPain: 2,
      },
      { endpoint: 'daily-metrics-post' }
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

export default function () {
  const clientId = TARGET_CLIENT_IDS[(__VU + __ITER) % TARGET_CLIENT_IDS.length]
  const roll = Math.random()

  if (roll < weights.read) {
    runReadFlow(clientId)
  } else if (roll < weights.read + weights.write) {
    runWriteFlow(clientId)
  } else {
    runDashboardFlow()
  }

  sleep(1)
}
