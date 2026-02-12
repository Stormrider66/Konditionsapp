import http from 'k6/http'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export function buildHeaders(extra = {}) {
  const headers = {
    Accept: 'application/json',
    ...extra,
  }

  if (__ENV.BEARER_TOKEN) {
    headers.Authorization = `Bearer ${__ENV.BEARER_TOKEN}`
  }
  if (__ENV.AUTH_COOKIE) {
    headers.Cookie = __ENV.AUTH_COOKIE
  }

  return headers
}

export function get(path, tags = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: buildHeaders(),
    tags,
  })
}

export function postJson(path, body, tags = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    tags,
  })
}

export function requiredEnv(name) {
  const value = __ENV[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}
