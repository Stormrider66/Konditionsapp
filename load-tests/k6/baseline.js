import { check, group, sleep } from 'k6'
import { get, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const BUSINESS_ID = requiredEnv('BUSINESS_ID')
const TEAM_ID = requiredEnv('TEAM_ID')
const START_DATE = __ENV.START_DATE || '2026-01-01'
const END_DATE = __ENV.END_DATE || '2026-12-31'

export const options = {
  scenarios: {
    baseline_reads: {
      executor: 'ramping-vus',
      stages: [
        { duration: '3m', target: 50 },
        { duration: '7m', target: 150 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1800', 'p(99)<3000'],
  },
}

export default function () {
  group('business-stats', () => {
    const res = get(`/api/business/${BUSINESS_ID}/stats`, { endpoint: 'business-stats' })
    check(res, {
      'business-stats status is 200': (r) => r.status === 200,
    })
  })

  group('team-dashboard', () => {
    const res = get(`/api/teams/${TEAM_ID}/dashboard`, { endpoint: 'team-dashboard' })
    check(res, {
      'team-dashboard status is 200': (r) => r.status === 200,
    })
  })

  group('calendar-unified', () => {
    const res = get(
      `/api/calendar/unified?clientId=${CLIENT_ID}&startDate=${START_DATE}&endDate=${END_DATE}`,
      { endpoint: 'calendar-unified' }
    )
    check(res, {
      'calendar status is 200': (r) => r.status === 200,
    })
  })

  sleep(1)
}
