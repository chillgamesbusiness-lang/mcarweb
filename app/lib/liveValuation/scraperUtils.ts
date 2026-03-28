/**
 * Scraper Utilities — Shared HTTP helpers for listing scrapers.
 *
 * Features:
 *  - User-agent rotation (realistic UK browser fingerprints)
 *  - Rate limiting (1–3 req/sec max, configurable per-domain)
 *  - Retry with exponential backoff (3 attempts max)
 *  - Response validation (status check + size guard)
 */

// ── User-agent pool (real UK browser strings) ──────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// ── Rate limiter (per-domain, in-memory) ───────────────────────────────────────

const domainTimestamps = new Map<string, number[]>()

const DOMAIN_RATE_LIMITS: Record<string, number> = {
  'autotrader.co.uk': 2,    // 2 req/sec
  'ebay.co.uk': 2,          // 2 req/sec
  default: 1,               // 1 req/sec fallback
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

/**
 * Wait if needed to stay within rate limit for the domain.
 * Returns the wait time in ms (0 if no wait needed).
 */
export async function enforceRateLimit(url: string): Promise<number> {
  const domain = getDomain(url)
  const maxPerSec = DOMAIN_RATE_LIMITS[domain] ?? DOMAIN_RATE_LIMITS.default
  const now = Date.now()
  const windowMs = 1000

  let timestamps = domainTimestamps.get(domain) ?? []
  timestamps = timestamps.filter(ts => ts > now - windowMs)

  if (timestamps.length >= maxPerSec) {
    const oldestInWindow = timestamps[0]
    const waitMs = windowMs - (now - oldestInWindow) + Math.floor(Math.random() * 200) + 50
    await new Promise(resolve => setTimeout(resolve, waitMs))
    timestamps = timestamps.filter(ts => ts > Date.now() - windowMs)
  }

  timestamps.push(Date.now())
  domainTimestamps.set(domain, timestamps)
  return 0
}

// ── Fetch with retry + backoff ─────────────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1000
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024  // 2MB guard

export interface FetchOptions {
  maxRetries?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {}
): Promise<string> {
  const maxRetries = opts.maxRetries ?? MAX_RETRIES
  const timeoutMs = opts.timeoutMs ?? 15_000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await enforceRateLimit(url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          ...opts.headers,
        },
      })

      clearTimeout(timer)

      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          // Retryable errors
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500
          console.warn(`[scraper] ${res.status} from ${getDomain(url)}, retry in ${Math.round(backoff)}ms`)
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }
        throw new Error(`HTTP ${res.status} from ${getDomain(url)}`)
      }

      const contentLength = res.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        throw new Error(`Response too large: ${contentLength} bytes`)
      }

      const text = await res.text()
      if (text.length > MAX_RESPONSE_SIZE) {
        throw new Error(`Response body too large: ${text.length} chars`)
      }

      return text
    } catch (err) {
      clearTimeout(timer)

      if (attempt === maxRetries - 1) {
        throw err
      }

      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort) {
        console.warn(`[scraper] Timeout on ${getDomain(url)}, attempt ${attempt + 1}`)
      }

      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500
      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }

  throw new Error(`All ${maxRetries} retries exhausted for ${getDomain(url)}`)
}

// ── HTML text extraction helpers ───────────────────────────────────────────────

/** Strip HTML tags and decode common entities. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&pound;/g, '£')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract first number from a string (e.g. "£12,500" → 12500). */
export function extractPrice(text: string): number | null {
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  const n = parseFloat(match[1])
  return isNaN(n) ? null : n
}

/** Extract mileage from text (e.g. "45,231 miles" → 45231). */
export function extractMileage(text: string): number | null {
  const match = text.replace(/,/g, '').match(/(\d+)\s*(?:miles?|mi)/i)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return isNaN(n) ? null : n
}

/** Extract year from text (e.g. "2019 Ford Fiesta" → 2019). */
export function extractYear(text: string): number | null {
  const match = text.match(/\b(19\d{2}|20[0-2]\d)\b/)
  if (!match) return null
  return parseInt(match[1], 10)
}
