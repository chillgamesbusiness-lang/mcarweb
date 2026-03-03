/**
 * Provider Manager — Central registry for all market data providers.
 *
 * Responsibilities:
 *   - Maintain list of all registered providers
 *   - Fetch from all enabled providers in parallel with individual error isolation
 *   - Collect results + errors for telemetry/debugging
 *   - Respect per-provider timeouts (8s hard cap per provider)
 *
 * Adding a new provider:
 *   1. Implement CompProvider interface
 *   2. Import and add to PROVIDERS array below
 *   3. Provider auto-disables itself if env vars are missing
 */

import type {
  CompProvider,
  CompProviderQuery,
  ProviderResult,
} from '@/lib/providers/providerTypes'

// ── Import all providers ───────────────────────────────────────────────────────

import { ebayProvider } from '@/lib/providers/ebayProvider'
import { regcheckProvider } from '@/lib/providers/regcheckProvider'
import { bregoProvider } from '@/lib/providers/bregoProvider'
import { oneAutoProvider } from '@/lib/providers/oneAutoProvider'
import { motorSpecsProvider } from '@/lib/providers/motorSpecsProvider'
import { marketcheckProvider } from '@/lib/providers/marketcheckProvider'

// ── Provider registry ──────────────────────────────────────────────────────────

const PROVIDERS: CompProvider[] = [
  ebayProvider,
  regcheckProvider,
  bregoProvider,
  oneAutoProvider,
  motorSpecsProvider,
  marketcheckProvider,
]

// ── Per-provider hard timeout ──────────────────────────────────────────────────

const PROVIDER_TIMEOUT_MS = 8_000

// ── Fetch result wrapper ───────────────────────────────────────────────────────

interface ProviderFetchOutcome {
  provider: string
  result: ProviderResult | null
  error: string | null
  durationMs: number
}

// ── Main fetch function ────────────────────────────────────────────────────────

/**
 * Fetch comps from ALL enabled providers in parallel.
 * Each provider is individually error-isolated — one failure does not affect others.
 * Returns results array (only successful, non-empty) + diagnostics.
 */
export async function fetchAllProviders(
  query: CompProviderQuery,
): Promise<{
  results: ProviderResult[]
  diagnostics: ProviderFetchOutcome[]
}> {
  const enabledProviders = PROVIDERS.filter(p => p.enabled)

  if (enabledProviders.length === 0) {
    return { results: [], diagnostics: [] }
  }

  const outcomes = await Promise.allSettled(
    enabledProviders.map(async (provider): Promise<ProviderFetchOutcome> => {
      const start = Date.now()
      try {
        // Race provider against hard timeout
        const result = await Promise.race([
          provider.fetchComps(query),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${provider.name} timed out after ${PROVIDER_TIMEOUT_MS}ms`)), PROVIDER_TIMEOUT_MS)
          ),
        ])

        return {
          provider: provider.name,
          result,
          error: result.error,
          durationMs: Date.now() - start,
        }
      } catch (err) {
        return {
          provider: provider.name,
          result: null,
          error: err instanceof Error ? err.message : 'Unknown provider error',
          durationMs: Date.now() - start,
        }
      }
    })
  )

  const diagnostics: ProviderFetchOutcome[] = outcomes.map(o =>
    o.status === 'fulfilled' ? o.value : {
      provider: 'unknown',
      result: null,
      error: o.reason instanceof Error ? o.reason.message : 'Promise rejected',
      durationMs: 0,
    }
  )

  const results: ProviderResult[] = diagnostics
    .filter(d => d.result !== null)
    .map(d => d.result!)

  return { results, diagnostics }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

/** Get list of all registered providers and their enabled status. */
export function getProviderStatus(): { name: string; enabled: boolean }[] {
  return PROVIDERS.map(p => ({ name: p.name, enabled: p.enabled }))
}

/** Count of currently enabled providers. */
export function enabledProviderCount(): number {
  return PROVIDERS.filter(p => p.enabled).length
}
