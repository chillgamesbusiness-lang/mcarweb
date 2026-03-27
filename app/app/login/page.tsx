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
      {/* Left — premium dark brand panel with animated gradient */}
      <div className="hidden md:flex w-2/5 gradient-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-gold/8 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-gold/5 rounded-full blur-[80px] animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <span className="text-white font-extrabold text-lg">M</span>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-snug">
            Vehicle<br />Acquisition<br /><span className="gradient-gold-text">Platform</span>
          </h2>
        </div>
        <p className="text-[11px] text-white/20 relative z-10">Staff access only</p>
      </div>

      {/* Right — premium form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <span className="text-white font-extrabold">M</span>
            </div>
            <span className="text-xl font-extrabold text-foreground">MCar</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-warm-gray mb-8">Staff portal</p>

          {error === 'invalid_credentials' && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              Invalid email or password.
            </div>
          )}

          {error === 'too_many_attempts' && (
            <div className="mb-5 rounded-xl bg-orange-50 border border-orange-200/50 p-4 text-sm text-orange-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Too many attempts. Wait 5 minutes.
            </div>
          )}

          {error === 'no_role' && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              No role assigned. Contact an administrator.
            </div>
          )}

          <form action={login} className="card-premium p-7 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-warm-border bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-warm-gray/50 input-premium focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-warm-border bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-warm-gray/50 input-premium focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <SubmitButton
              loadingText="Signing in…"
              className="w-full rounded-2xl gradient-gold px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            >
              Sign in
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  )
}
