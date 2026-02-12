import { check, group, sleep } from 'k6'
import { get, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const START_DATE = __ENV.START_DATE || '2026-01-01'
const END_DATE = __ENV.END_DATE || '2026-12-31'

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
  },
}

export default function () {
  group('calendar-unified', () => {
    const res = get(
      `/api/calendar/unified?clientId=${CLIENT_ID}&startDate=${START_DATE}&endDate=${END_DATE}`,
      { endpoint: 'calendar-unified' }
    )
    check(res, {
      'calendar status is 200': (r) => r.status === 200,
    })
  })

  group('race-results-list', () => {
    const res = get(`/api/race-results?clientId=${CLIENT_ID}`, { endpoint: 'race-results-list' })
    check(res, {
      'race-results status is 200': (r) => r.status === 200,
    })
  })

  sleep(1)
}
