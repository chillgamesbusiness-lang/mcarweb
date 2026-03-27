import { login } from './actions'
import { SubmitButton } from '@/app/components/SubmitButton'

export const metadata = {
  title: 'Staff Sign In',
  robots: { index: false, follow: false },
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="min-h-screen flex">
      {/* Left — dark brand panel */}
      <div className="hidden md:flex w-1/3 bg-charcoal flex-col justify-between p-10">
        <div>
          <div className="h-0.5 w-8 bg-gold mb-6" />
          <p className="text-2xl font-bold tracking-tight text-white/90">MCar</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 mt-1">Vehicle Acquisition</p>
        </div>
        <p className="text-[11px] text-white/20">Staff access only</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-xs">
          <h1 className="text-3xl font-bold tracking-tight text-charcoal mb-1">Sign in</h1>
          <p className="text-sm text-warm-gray mb-8">Staff portal</p>

          {error === 'invalid_credentials' && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              Invalid email or password.
            </div>
          )}

          {error === 'too_many_attempts' && (
            <div className="mb-4 rounded bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
              Too many attempts. Wait 5 minutes.
            </div>
          )}

          {error === 'no_role' && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              No role assigned. Contact an administrator.
            </div>
          )}

          <form action={login} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs text-warm-gray mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal placeholder:text-warm-gray/50 focus:border-gold focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs text-warm-gray mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full border-b border-warm-border bg-transparent px-1 py-2 text-sm text-charcoal placeholder:text-warm-gray/50 focus:border-gold focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <SubmitButton
              loadingText="Signing in…"
              className="text-sm font-semibold text-gold hover:text-gold-dark transition-colors disabled:opacity-60"
            >
              Sign in →
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  )
}
