import { check, group, sleep } from 'k6'
import { get, requiredEnv } from './helpers.js'

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

const READ_WEIGHT = Math.max(0, parseFloat(__ENV.HOCKEY_PILOT_READ_WEIGHT || '0.55') || 0.55)
const DASHBOARD_WEIGHT = Math.max(0, parseFloat(__ENV.HOCKEY_PILOT_DASHBOARD_WEIGHT || '0.25') || 0.25)
const EXPORT_WEIGHT = Math.max(0, parseFloat(__ENV.HOCKEY_PILOT_EXPORT_WEIGHT || '0.20') || 0.20)

const TEAM_DASHBOARD_DAYS = Math.max(1, Math.min(parseInt(__ENV.TEAM_DASHBOARD_DAYS || '30', 10) || 30, 90))
const EXPORT_PRESET = __ENV.HOCKEY_EXPORT_PRESET || 'aerobic_profile'

function normalizedWeights() {
  const total = READ_WEIGHT + DASHBOARD_WEIGHT + EXPORT_WEIGHT
  if (total <= 0) {
    return { read: 0.55, dashboard: 0.25, exportFlow: 0.20 }
  }
  return {
    read: READ_WEIGHT / total,
    dashboard: DASHBOARD_WEIGHT / total,
    exportFlow: EXPORT_WEIGHT / total,
  }
}

function businessSlugParam() {
  return BUSINESS_SLUG ? `&businessSlug=${encodeURIComponent(BUSINESS_SLUG)}` : ''
}

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
  } else if (roll < weights.read + weights.dashboard) {
    runDashboardFlow()
  } else {
    runExportFlow()
  }

  sleep(1)
}
