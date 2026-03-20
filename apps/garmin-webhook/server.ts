import http from 'http'
import { URL } from 'url'
import { logger } from '@/lib/logger'
import {
  GarminWebhookPayload,
  logGarminWebhookReceipt,
  processGarminWebhookPayload,
  verifyGarminWebhookRequest,
} from '@/lib/integrations/garmin/webhook-service'

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const MAX_BODY_BYTES = 100 * 1024 * 1024
const VERIFY_TOKEN = process.env.GARMIN_WEBHOOK_VERIFY_TOKEN

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: http.IncomingMessage): Promise<GarminWebhookPayload> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []

    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (url.pathname !== '/api/integrations/garmin/webhook') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  if (req.method === 'GET') {
    const result = verifyGarminWebhookRequest({
      verifyToken: url.searchParams.get('verify_token'),
      challenge: url.searchParams.get('challenge'),
      expectedVerifyToken: VERIFY_TOKEN,
    })
    sendJson(res, result.status, result.body)
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const payload = await readJsonBody(req)
    logGarminWebhookReceipt(payload)
    const results = await processGarminWebhookPayload(payload)
    sendJson(res, 200, { received: true, ...results })
  } catch (error) {
    logger.error('Garmin webhook error (Cloud Run)', {}, error)
    sendJson(res, 200, { received: true, error: 'Processing error' })
  }
})

server.listen(PORT, HOST, () => {
  logger.info('Garmin webhook service listening', { host: HOST, port: PORT })
})
