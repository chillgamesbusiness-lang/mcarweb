import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function InspectorLayout({ children }: { children: React.ReactNode }) {
  // Role-level guard — prevents an admin account from reaching /inspector
  // and double-checks auth in case middleware is ever bypassed.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service client for role lookup — bypasses RLS circular dependency
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'inspector') redirect('/login')
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <aside className="hidden lg:flex w-56 bg-charcoal-deep dark:bg-surface-elevated flex-col shrink-0 relative">
        <div className="h-1 gradient-gold" />

        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <span className="text-white font-extrabold text-sm">M</span>
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-white">MCar</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-gold/80">Inspector</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <Link
            href="/inspector"
            className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-white/70 hover:text-white rounded-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
            My Inspections
          </Link>
        </nav>

        <div className="px-3 py-5 border-t border-white/5">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 text-left text-[13px] text-white/60 hover:text-red-300 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — visible on <lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-charcoal-deep flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shadow-md shadow-gold/20">
            <span className="text-white font-extrabold text-xs">M</span>
          </div>
          <span className="text-sm font-bold text-white">Inspector</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/inspector" className="p-2 text-white/70 hover:text-white transition-colors" aria-label="My inspections">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
          </Link>
          <form action={logout} className="inline">
            <button type="submit" className="p-2 text-white/60 hover:text-red-300 transition-colors" aria-label="Sign out">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Page content — offset for mobile top bar */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
