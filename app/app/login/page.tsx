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
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(340px,42vw)_1fr]">
      <div className="hidden lg:flex min-h-screen flex-col justify-between overflow-hidden bg-surface-warm dark:bg-charcoal-deep p-10 xl:p-14 relative">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <span className="text-white font-extrabold text-lg">M</span>
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-foreground dark:text-white">MCar</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-gold/80">Staff Desk</p>
            </div>
          </div>
          <h2 className="max-w-sm text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground dark:text-white leading-[1.05]">
            Acquisition control, without the noise.
          </h2>
            <div className="mt-10 max-w-md rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 shadow-2xl shadow-black/20">
            {['Lead intake', 'Booking queue', 'Inspector review', 'Outcome tracking'].map((item, index) => (
              <div key={item} className="flex items-center gap-3 border-b border-foreground/[0.07] py-3 first:pt-0 last:border-b-0 last:pb-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-[11px] font-bold text-gold">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-sm font-medium text-foreground/75">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-foreground/55 relative z-10">Secure staff access</p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <span className="text-white font-extrabold">M</span>
            </div>
            <span className="text-xl font-extrabold text-foreground">MCar</span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold mb-3">Staff Portal</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-foreground mb-2">Welcome back</h1>
            <p className="text-sm text-warm-gray">Sign in to manage leads, bookings, inspections, and outcomes.</p>
          </div>

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

          {error === 'session_expired' && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200/50 p-4 text-sm text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Your session has expired. Please sign in again.
            </div>
          )}

          {error === 'server_error' && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              A server error occurred. Please try again in a moment.
            </div>
          )}

          <form action={login} className="card-premium p-6 sm:p-7 space-y-5 shadow-2xl shadow-black/5">
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
          <p className="mt-5 text-center text-[11px] text-warm-gray/70">Access is restricted to active staff accounts.</p>
        </div>
      </div>
    </main>
  )
}
