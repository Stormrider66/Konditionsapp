import { check, group, sleep } from 'k6'
import { get, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const START_DATE = __ENV.START_DATE || '2026-01-01'
const END_DATE = __ENV.END_DATE || '2026-12-31'
const CALENDAR_INCLUDE_ITEMS = (__ENV.CALENDAR_INCLUDE_ITEMS || 'true').toLowerCase() !== 'false'
const CALENDAR_INCLUDE_GROUPED =
  (__ENV.CALENDAR_INCLUDE_GROUPED_BY_DATE || 'false').toLowerCase() !== 'false'

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
    // Per-endpoint breakdown (lenient thresholds used only to print p95/p99).
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
    'endpoint_duration{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:daily-metrics-get}': ['rate<1.1'],
    'endpoint_mw_bypass{endpoint:daily-metrics-get}': ['rate>=0'],
    'endpoint_handler_ms{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_overhead_ms{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_mw_ms{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_next_queue_ms{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

export default function () {
  group('calendar-unified', () => {
    const res = get(
      `/api/calendar/unified?clientId=${CLIENT_ID}&startDate=${START_DATE}&endDate=${END_DATE}&includeItems=${CALENDAR_INCLUDE_ITEMS ? 'true' : 'false'}&includeGroupedByDate=${CALENDAR_INCLUDE_GROUPED ? 'true' : 'false'}`,
      { endpoint: 'calendar-unified' }
    )
    check(res, {
      'calendar status is 200': (r) => r.status === 200,
    })
  })

  group('daily-metrics-read', () => {
    const res = get(`/api/daily-metrics?clientId=${CLIENT_ID}&days=30`, { endpoint: 'daily-metrics-get' })
    check(res, {
      'daily-metrics GET status is 200': (r) => r.status === 200,
    })
  })

  sleep(1)
}
