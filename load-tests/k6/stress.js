import { check, group, sleep } from 'k6'
import { get, postJson, requiredEnv } from './helpers.js'

const CLIENT_ID = requiredEnv('CLIENT_ID')
const CLIENT_IDS = (__ENV.CLIENT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
const TARGET_CLIENT_IDS = CLIENT_IDS.length > 0 ? CLIENT_IDS : [CLIENT_ID]
const ENABLE_AI = (__ENV.ENABLE_AI || 'false').toLowerCase() === 'true'
const ENABLE_WEBHOOK = (__ENV.ENABLE_WEBHOOK || 'false').toLowerCase() === 'true'

export const options = {
  scenarios: {
    write_and_external_mix: {
      executor: 'ramping-vus',
      stages: [
        { duration: '4m', target: 100 },
        { duration: '8m', target: 300 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<2500', 'p(99)<5000'],
    // Per-endpoint breakdown (lenient thresholds used only to print p95/p99).
    'endpoint_duration{endpoint:daily-metrics-post}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:daily-metrics-post}': ['rate<1.1'],
    'endpoint_duration{endpoint:daily-metrics-get}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:daily-metrics-get}': ['rate<1.1'],
    'endpoint_duration{endpoint:ai-chat-post}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:ai-chat-post}': ['rate<1.1'],
    'endpoint_duration{endpoint:strava-webhook-post}': ['p(95)<600000', 'p(99)<600000'],
    'endpoint_failed{endpoint:strava-webhook-post}': ['rate<1.1'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export default function () {
  const clientId = TARGET_CLIENT_IDS[(__VU + __ITER) % TARGET_CLIENT_IDS.length]

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
      'daily-metrics status 200/201': (r) => r.status === 200 || r.status === 201,
    })
  })

  group('daily-metrics-read', () => {
    const res = get(`/api/daily-metrics?clientId=${clientId}&days=30`, {
      endpoint: 'daily-metrics-get',
    })
    check(res, {
      'daily-metrics GET status is 200': (r) => r.status === 200,
    })
  })

  if (ENABLE_AI) {
    group('ai-chat-short-prompt', () => {
      const res = postJson(
        '/api/ai/chat',
        {
          messages: [{ role: 'user', content: 'Ge mig ett kort återhämtningspass idag.' }],
          model: 'gpt-5.2',
          provider: 'OPENAI',
          isAthleteChat: true,
          clientId,
          webSearchEnabled: false,
        },
        { endpoint: 'ai-chat-post' }
      )
      check(res, {
        'ai-chat status 200': (r) => r.status === 200,
      })
    })
  }

  if (ENABLE_WEBHOOK) {
    group('strava-webhook', () => {
      const res = postJson(
        '/api/integrations/strava/webhook',
        [{ object_type: 'activity', object_id: 1234567890, aspect_type: 'create', owner_id: 111 }],
        { endpoint: 'strava-webhook-post' }
      )
      check(res, {
        'strava-webhook status 200/202': (r) => r.status === 200 || r.status === 202,
      })
    })
  }

  sleep(1)
}
