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
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-charcoal">Staff Sign In</h1>
          <p className="mt-1 text-sm text-warm-gray">Vehicle Acquisition CRM</p>
        </div>

        {error === 'invalid_credentials' && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Invalid email or password.
          </div>
        )}

        {error === 'too_many_attempts' && (
          <div className="mb-4 rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
            Too many sign-in attempts. Please wait 5 minutes and try again.
          </div>
        )}

        {error === 'no_role' && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Your account does not have an assigned role. Contact an administrator.
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal-light mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-warm-border px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal-light mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-warm-border px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              placeholder="••••••••"
            />
          </div>

          <SubmitButton
            loadingText="Signing in…"
            className="w-full rounded-md bg-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-charcoal-light focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Sign in
          </SubmitButton>
        </form>
      </div>
    </main>
  )
}
