/**
 * Very small local HTTP load balancer (round-robin).
 *
 * Why: `next start` runs single-process by default. Under heavier k6 loads on Windows,
 * requests can spend seconds queued before the route handler even starts. Running
 * multiple Next.js workers and proxying to them lets us validate horizontal scaling.
 *
 * Usage:
 *   node scripts/local-lb.js
 *
 * Env:
 *   LISTEN_HOST=127.0.0.1
 *   LISTEN_PORT=3000
 *   UPSTREAM_HOST=127.0.0.1
 *   UPSTREAM_PORTS=3001,3002,3003,3004
 */

const http = require('http')

const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1'
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '3000', 10)
const UPSTREAM_HOST = process.env.UPSTREAM_HOST || '127.0.0.1'
const UPSTREAM_PORTS = String(process.env.UPSTREAM_PORTS || '3001,3002,3003,3004')
  .split(',')
  .map((p) => parseInt(p.trim(), 10))
  .filter((p) => Number.isFinite(p) && p > 0)

if (UPSTREAM_PORTS.length === 0) {
  console.error('local-lb: missing UPSTREAM_PORTS')
  process.exit(1)
}

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 2048,
})

let rr = 0
function pickUpstreamPortFromPool(pool) {
  const effectivePool = pool && pool.length ? pool : UPSTREAM_PORTS
  const port = effectivePool[rr % effectivePool.length]
  rr = (rr + 1) >>> 0
  return port
}

function hash32(str) {
  // djb2-ish; good enough for local sticky routing
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  // force uint32
  return h >>> 0
}

function stickyKeyFromRequest(req) {
  const url = String(req.url || '')
  if (url.startsWith('/api/calendar/unified')) {
    // Sticky by clientId to keep per-process calendar cache warm.
    const m = url.match(/[?&]clientId=([^&]+)/i)
    return m ? `calendar:${decodeURIComponent(m[1])}` : 'calendar:unknown'
  }
  // For other endpoints, prefer round-robin to spread queueing across workers.
  // (Once warm, each worker will have its own in-memory cache anyway.)
  return null
}

function pickUpstreamPortSticky(req) {
  // Deterministic routing to keep per-process caches warm and avoid overloading one worker.
  // With 4 workers: calendar->3001, business->3002, team->3003, spare->3004.
  const url = String(req.url || '')

  const calendarPort = UPSTREAM_PORTS[0]
  const businessPort = UPSTREAM_PORTS[1] ?? UPSTREAM_PORTS[0]
  const teamPort = UPSTREAM_PORTS[2] ?? UPSTREAM_PORTS[0]
  const fallbackPool = UPSTREAM_PORTS.length > 3 ? UPSTREAM_PORTS.slice(3) : UPSTREAM_PORTS

  if (url.startsWith('/api/calendar/unified')) return calendarPort
  if (/^\/api\/business\/[^/]+\/stats/i.test(url)) return businessPort
  if (/^\/api\/teams\/[^/]+\/dashboard/i.test(url)) return teamPort

  const key = stickyKeyFromRequest(req)
  if (!key) return pickUpstreamPortFromPool(fallbackPool)
  const idx = hash32(key) % fallbackPool.length
  return fallbackPool[idx]
}

const server = http.createServer((req, res) => {
  const upstreamPort = pickUpstreamPortSticky(req)
  const headers = { ...req.headers }

  // Preserve original host; also provide forwarding headers.
  headers['x-forwarded-host'] = headers.host || `${LISTEN_HOST}:${LISTEN_PORT}`
  headers['x-forwarded-proto'] = 'http'
  headers['x-forwarded-for'] = '127.0.0.1'
  headers.connection = 'keep-alive'

  const proxyReq = http.request(
    {
      host: UPSTREAM_HOST,
      port: upstreamPort,
      method: req.method,
      path: req.url,
      headers,
      agent,
    },
    (proxyRes) => {
      // Pass through status + headers.
      res.setHeader('x-lb-upstream-port', String(upstreamPort))
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', (err) => {
    res.statusCode = 502
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('x-lb-upstream-port', String(upstreamPort))
    res.end(`Bad gateway: ${String(err && err.message ? err.message : err)}`)
  })

  req.pipe(proxyReq)
})

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(
    `local-lb listening on http://${LISTEN_HOST}:${LISTEN_PORT} -> ${UPSTREAM_HOST}:${UPSTREAM_PORTS.join(',')}`
  )
})

