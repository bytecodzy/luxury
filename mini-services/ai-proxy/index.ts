/**
 * AI Proxy Mini-Service — Stable version
 * Proxies requests to internal AI service at 172.25.136.193:8080
 */
import { readFileSync } from 'fs'
import { join } from 'path'

process.on('uncaughtException', (err) => {
  console.error('[ai-proxy] UNCAUGHT:', err?.message || String(err))
})
process.on('unhandledRejection', (err) => {
  console.error('[ai-proxy] UNHANDLED:', err?.message || String(err))
})

let AI_CONFIG: Record<string, string> = {}
try {
  const os = await import('os')
  for (const p of [join(process.cwd(), '../../.z-ai-config'), join(os.homedir(), '.z-ai-config'), '/etc/.z-ai-config']) {
    try { AI_CONFIG = JSON.parse(readFileSync(p, 'utf-8')); console.log(`[ai-proxy] Config: ${p}`); break } catch { continue }
  }
} catch { console.error('[ai-proxy] No config') }

const AI_HOST = '172.25.136.193'
const AI_PORT = 8080
const PORT = 3030

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AI_CONFIG.apiKey || 'Z.ai'}`,
  'X-Z-AI-From': 'Z',
  'X-Chat-Id': AI_CONFIG.chatId || '',
  'X-User-Id': AI_CONFIG.userId || '',
  'X-Token': AI_CONFIG.token || '',
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' }})
    }

    if (url.pathname === '/health') {
      try {
        const r = await fetch(`http://${AI_HOST}:${AI_PORT}/dashboard/`, { signal: AbortSignal.timeout(3000) })
        return Response.json({ status: 'ok', mode: 'ai', available: true })
      } catch { return Response.json({ status: 'degraded' }, { status: 503 }) }
    }

    if (url.pathname === '/api/try-on/status') {
      try {
        const r = await fetch(`http://${AI_HOST}:${AI_PORT}/dashboard/`, { signal: AbortSignal.timeout(3000) })
        return Response.json({ available: r.ok, mode: 'ai', proxied: true })
      } catch { return Response.json({ available: false, mode: 'client' }) }
    }

    // Proxy to AI service
    let targetPath = url.pathname
    if (!targetPath.startsWith('/v1/')) targetPath = '/v1' + targetPath
    const targetUrl = `http://${AI_HOST}:${AI_PORT}${targetPath}${url.search}`
    console.log(`[ai-proxy] ${req.method} ${url.pathname} → ${targetUrl}`)
    
    try {
      let body: string | undefined
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = await req.text()
      }
      
      const headers = { ...AUTH_HEADERS }
      if (req.headers.get('Content-Type')) headers['Content-Type'] = req.headers.get('Content-Type')!

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        signal: AbortSignal.timeout(120000),
      })

      const ct = proxyRes.headers.get('Content-Type') || 'application/json'
      console.log(`[ai-proxy] → ${proxyRes.status} (${ct})`)

      const text = await proxyRes.text()
      
      return new Response(text, {
        status: proxyRes.status,
        headers: { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' },
      })
    } catch (err: any) {
      console.error(`[ai-proxy] Error:`, err?.message)
      return Response.json({ error: 'AI proxy error', details: err?.message }, { status: 502 })
    }
  },
})

console.log(`[ai-proxy] Port ${PORT} → http://${AI_HOST}:${AI_PORT}`)
