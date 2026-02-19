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
const UPSTREAM_TIMEOUT_MS = Math.max(
  1000,
  Math.min(parseInt(process.env.UPSTREAM_TIMEOUT_MS || '30000', 10) || 30000, 120000)
)
const UPSTREAM_CONNECT_TIMEOUT_MS = Math.max(
  250,
  Math.min(parseInt(process.env.UPSTREAM_CONNECT_TIMEOUT_MS || '2000', 10) || 2000, 30000)
)
const UPSTREAM_PORTS = String(process.env.UPSTREAM_PORTS || '3001,3002,3003,3004')
  .split(',')
  .map((p) => parseInt(p.trim(), 10))
  .filter((p) => Number.isFinite(p) && p > 0)

if (UPSTREAM_PORTS.length === 0) {
  console.error('local-lb: missing UPSTREAM_PORTS')
  process.exit(1)
}

// Keep-alive between LB -> workers can get into weird half-open/stall states on Windows.
// For perf testing stability, prefer short-lived upstream sockets.
const agent = new http.Agent({ keepAlive: false, maxSockets: 2048 })

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
  if (/^\/api\/business\/[^/]+\/stats/i.test(url)) {
    // Sticky by businessId to keep per-process stats cache warm.
    const m = url.match(/^\/api\/business\/([^/]+)\/stats/i)
    return m ? `business:${decodeURIComponent(m[1])}` : 'business:unknown'
  }
  if (/^\/api\/teams\/[^/]+\/dashboard/i.test(url)) {
    // Sticky by teamId to keep per-process dashboard cache warm.
    const m = url.match(/^\/api\/teams\/([^/]+)\/dashboard/i)
    return m ? `team:${decodeURIComponent(m[1])}` : 'team:unknown'
  }

  // For other endpoints, prefer round-robin to spread queueing across workers.
  // (Once warm, each worker will have its own in-memory cache anyway.)
  return null
}

function pickUpstreamPortSticky(req) {
  // Hybrid routing:
  // - Calendar: consistent-hash by clientId over a dedicated pool (warm caches + spread load)
  // - Business/team: round-robin over a dedicated pool (single businessId/teamId should still scale)
  //
  // Rationale: in our k6 runs, business/team IDs are often constant, so hashing by ID still pins
  // everything to one worker. Round-robin solves that while keeping calendar cache locality.
  const url = String(req.url || '')

  const half = Math.max(1, Math.ceil(UPSTREAM_PORTS.length / 2))
  const calendarPool = UPSTREAM_PORTS.slice(0, half)
  const otherPool = UPSTREAM_PORTS.slice(half)

  if (url.startsWith('/api/calendar/unified')) {
    // Round-robin calendar across the calendar pool so a single hot clientId
    // can use multiple workers (reduces event-loop queueing). Each worker will
    // warm its own in-memory cache quickly under sustained load.
    const pool = calendarPool.length ? calendarPool : UPSTREAM_PORTS
    return pickUpstreamPortFromPool(pool)
  }

  if (/^\/api\/business\/[^/]+\/stats/i.test(url) || /^\/api\/teams\/[^/]+\/dashboard/i.test(url)) {
    const pool = otherPool.length ? otherPool : UPSTREAM_PORTS
    return pickUpstreamPortFromPool(pool)
  }

  // Default: spread across all workers.
  return pickUpstreamPortFromPool(UPSTREAM_PORTS)
}

const server = http.createServer((req, res) => {
  const upstreamPort = pickUpstreamPortSticky(req)
  const headers = { ...req.headers }

  // Preserve original host; also provide forwarding headers.
  headers['x-forwarded-host'] = headers.host || `${LISTEN_HOST}:${LISTEN_PORT}`
  headers['x-forwarded-proto'] = 'http'
  headers['x-forwarded-for'] = '127.0.0.1'
  // Don't force `Connection: keep-alive` to upstream.
  delete headers.connection

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

      // If the upstream stream errors after we've started writing, we can no longer
      // adjust headers/status; just terminate the response.
      proxyRes.on('error', (err) => {
        try {
          res.destroy(err)
        } catch {
          // ignore
        }
      })
    }
  )

  const connectTimer = setTimeout(() => {
    proxyReq.destroy(new Error(`Upstream connect timeout after ${UPSTREAM_CONNECT_TIMEOUT_MS}ms`))
  }, UPSTREAM_CONNECT_TIMEOUT_MS)
  proxyReq.on('socket', (socket) => {
    if (!socket) return
    if (socket.connecting) socket.once('connect', () => clearTimeout(connectTimer))
    else clearTimeout(connectTimer)
  })

  proxyReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    proxyReq.destroy(new Error(`Upstream timeout after ${UPSTREAM_TIMEOUT_MS}ms`))
  })

  proxyReq.on('error', (err) => {
    clearTimeout(connectTimer)
    // If we already started sending the response (e.g. upstream aborted mid-stream),
    // we must not set headers/status again.
    if (res.headersSent || res.writableEnded) {
      try {
        res.destroy(err)
      } catch {
        // ignore
      }
      return
    }
    res.statusCode = 502
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('x-lb-upstream-port', String(upstreamPort))
    res.end(`Bad gateway: ${String(err && err.message ? err.message : err)}`)
  })

  // Most of our load-test traffic is GET/HEAD; explicitly end to avoid cases where
  // piping doesn't trigger an upstream `end()` promptly.
  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end()
  } else {
    req.pipe(proxyReq)
  }
})

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(
    `local-lb listening on http://${LISTEN_HOST}:${LISTEN_PORT} -> ${UPSTREAM_HOST}:${UPSTREAM_PORTS.join(',')}`
  )
})

