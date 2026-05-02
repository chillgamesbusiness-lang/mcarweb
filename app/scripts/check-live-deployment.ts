const baseUrl = (process.argv[2] ?? process.env.HANDOFF_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error('Usage: tsx scripts/check-live-deployment.ts https://example.com')
  process.exit(1)
}

const requiredHeaders = [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'content-security-policy',
  'permissions-policy',
]

const checks = [
  { path: '/', mustContainAny: ['MCar'] },
  { path: '/offer', mustContainAny: ['Get Your Valuation', 'Loading'] },
  { path: '/login', mustContainAny: ['Staff Portal'] },
  { path: '/privacy', mustContainAny: ['Privacy Policy'] },
  { path: '/sitemap.xml', mustContainAny: ['<urlset'] },
]

let failed = 0

async function main() {
  for (const check of checks) {
    const url = `${baseUrl}${check.path}`
    const response = await fetch(url, { redirect: 'manual' })
    const text = await response.text()
    const okStatus = response.status >= 200 && response.status < 400
    const okBody = check.mustContainAny.some((value) => text.includes(value))

    if (!okStatus || !okBody) {
      failed += 1
      console.error(`FAIL ${check.path}: status=${response.status} contains=${okBody}`)
    } else {
      console.log(`PASS ${check.path}`)
    }

    if (check.path === '/') {
      for (const header of requiredHeaders) {
        if (!response.headers.get(header)) {
          failed += 1
          console.error(`FAIL header ${header}`)
        } else {
          console.log(`PASS header ${header}`)
        }
      }
    }
  }

  if (failed > 0) process.exit(1)
  console.log(`Live deployment smoke passed for ${baseUrl}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})