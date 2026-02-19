import { check, group, sleep } from 'k6'
import { get, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const BUSINESS_ID = requiredEnv('BUSINESS_ID')
const TEAM_ID = requiredEnv('TEAM_ID')

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

// Default to a realistic "current month" range, but allow overrides for stress/debug.
const START_DATE = __ENV.START_DATE || isoStartOfCurrentMonthUtc()
const END_DATE = __ENV.END_DATE || isoEndOfCurrentMonthUtc()
const CALENDAR_INCLUDE_ITEMS = (__ENV.CALENDAR_INCLUDE_ITEMS || 'true').toLowerCase() !== 'false'
const CALENDAR_INCLUDE_GROUPED =
  // Default to lighter response in perf runs unless explicitly enabled.
  (__ENV.CALENDAR_INCLUDE_GROUPED_BY_DATE || 'false').toLowerCase() !== 'false'
const CALENDAR_ITEMS_MODE = (__ENV.CALENDAR_ITEMS_MODE || 'light').toLowerCase() === 'full' ? 'full' : 'light'
const CALENDAR_MAX_ITEMS_PER_SOURCE = Math.max(
  1,
  Math.min(parseInt(__ENV.CALENDAR_MAX_ITEMS_PER_SOURCE || '150', 10) || 150, 1000)
)
const TEAM_DASHBOARD_INCLUDE_MEMBER_STATS =
  (__ENV.TEAM_DASHBOARD_INCLUDE_MEMBER_STATS || 'false').toLowerCase() !== 'false'
const TEAM_DASHBOARD_INCLUDE_RECENT_BROADCASTS =
  (__ENV.TEAM_DASHBOARD_INCLUDE_RECENT_BROADCASTS || 'true').toLowerCase() !== 'false'
const TEAM_DASHBOARD_DAYS = Math.max(1, Math.min(parseInt(__ENV.TEAM_DASHBOARD_DAYS || '30', 10) || 30, 90))
const BUSINESS_STATS_INCLUDE_RECENT_TESTS =
  // Default to core counts only in perf runs unless explicitly enabled.
  (__ENV.BUSINESS_STATS_INCLUDE_RECENT_TESTS || 'false').toLowerCase() !== 'false'
const BUSINESS_STATS_INCLUDE_MONTHLY_TREND =
  (__ENV.BUSINESS_STATS_INCLUDE_MONTHLY_TREND || 'false').toLowerCase() !== 'false'
const BUSINESS_STATS_INCLUDE_BREAKDOWNS =
  (__ENV.BUSINESS_STATS_INCLUDE_BREAKDOWNS || 'false').toLowerCase() !== 'false'
const BUSINESS_STATS_INCLUDE_SUBSCRIPTIONS =
  (__ENV.BUSINESS_STATS_INCLUDE_SUBSCRIPTIONS || 'false').toLowerCase() !== 'false'
const BUSINESS_STATS_SHORT_WINDOW =
  (__ENV.BUSINESS_STATS_SHORT_WINDOW || 'true').toLowerCase() !== 'false'

const BASELINE_SCALE = Math.max(
  0.1,
  Math.min(parseFloat(__ENV.BASELINE_SCALE || '1') || 1, 1)
)

export const options = {
  scenarios: {
    baseline_reads: {
      executor: 'ramping-vus',
      stages: [
        { duration: '3m', target: Math.round(50 * BASELINE_SCALE) },
        { duration: '7m', target: Math.round(150 * BASELINE_SCALE) },
        { duration: '3m', target: Math.round(300 * BASELINE_SCALE) },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1800', 'p(99)<3000'],
    // Per-endpoint breakdown (lenient thresholds used only to print p95/p99).
    'endpoint_duration{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:business-stats}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:business-stats}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:business-stats}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:business-stats}': ['rate>=0'],
    'endpoint_mw_bypass{endpoint:business-stats}': ['rate>=0'],
    'endpoint_handler_ms{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_overhead_ms{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_mw_ms{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_next_queue_ms{endpoint:business-stats}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_duration{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:team-dashboard}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_mw_bypass{endpoint:team-dashboard}': ['rate>=0'],
    'endpoint_handler_ms{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_overhead_ms{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_mw_ms{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_next_queue_ms{endpoint:team-dashboard}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_duration{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:calendar-unified}': ['rate<1.1'],
    'endpoint_cache_hit{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_cache_stale{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_cache_miss{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_mw_bypass{endpoint:calendar-unified}': ['rate>=0'],
    'endpoint_handler_ms{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_overhead_ms{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_mw_ms{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_next_queue_ms{endpoint:calendar-unified}': ['p(95)<600000', 'p(99)<600000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

export default function () {
  group('business-stats', () => {
    const res = get(
      `/api/business/${BUSINESS_ID}/stats?includeRecentTests=${BUSINESS_STATS_INCLUDE_RECENT_TESTS ? 'true' : 'false'}&includeMonthlyTrend=${BUSINESS_STATS_INCLUDE_MONTHLY_TREND ? 'true' : 'false'}&includeBreakdowns=${BUSINESS_STATS_INCLUDE_BREAKDOWNS ? 'true' : 'false'}&includeSubscriptions=${BUSINESS_STATS_INCLUDE_SUBSCRIPTIONS ? 'true' : 'false'}&shortWindow=${BUSINESS_STATS_SHORT_WINDOW ? 'true' : 'false'}`,
      { endpoint: 'business-stats' }
    )
    check(res, {
      'business-stats status is 200': (r) => r.status === 200,
    })
  })

  group('team-dashboard', () => {
    const res = get(
      `/api/teams/${TEAM_ID}/dashboard?includeMemberStats=${TEAM_DASHBOARD_INCLUDE_MEMBER_STATS ? 'true' : 'false'}&includeRecentBroadcasts=${TEAM_DASHBOARD_INCLUDE_RECENT_BROADCASTS ? 'true' : 'false'}&days=${TEAM_DASHBOARD_DAYS}`,
      { endpoint: 'team-dashboard' }
    )
    check(res, {
      'team-dashboard status is 200': (r) => r.status === 200,
    })
  })

  group('calendar-unified', () => {
    const res = get(
      `/api/calendar/unified?clientId=${CLIENT_ID}&startDate=${START_DATE}&endDate=${END_DATE}&includeItems=${CALENDAR_INCLUDE_ITEMS ? 'true' : 'false'}&includeGroupedByDate=${CALENDAR_INCLUDE_GROUPED ? 'true' : 'false'}&itemsMode=${CALENDAR_ITEMS_MODE}&maxItemsPerSource=${CALENDAR_MAX_ITEMS_PER_SOURCE}`,
      { endpoint: 'calendar-unified' }
    )
    check(res, {
      'calendar status is 200': (r) => r.status === 200,
    })
  })

  sleep(1)
}
