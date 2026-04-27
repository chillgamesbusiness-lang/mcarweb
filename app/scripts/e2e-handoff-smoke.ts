const baseUrl = (process.env.HANDOFF_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

const paths = ['/', '/offer', '/offer/details', '/offer/contact', '/offer/book']

if (!baseUrl) {
  console.log('HANDOFF_BASE_URL or NEXT_PUBLIC_APP_URL is not set; HTTP smoke checks skipped.')
  process.exit(0)
}

async function main() {
  let failed = 0

  for (const path of paths) {
    const started = performance.now()
    try {
      const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' })
      const elapsed = Math.round(performance.now() - started)
      const ok = response.status < 500
      console.log(`${ok ? 'PASS' : 'FAIL'} ${path} status=${response.status} time=${elapsed}ms`)
      if (!ok) failed += 1
    } catch (error) {
      failed += 1
      console.error(`FAIL ${path} ${(error as Error).message}`)
    }
  }

  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error('Fatal:', error)
  process.exit(1)
})