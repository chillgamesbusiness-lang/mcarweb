import type { Metadata } from 'next'
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
      {/* Sidebar — dark, matching admin */}
      <aside className="w-52 bg-charcoal flex flex-col shrink-0">
        <div className="h-0.5 bg-gold" />

        <div className="px-5 pt-6 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold/60">Inspector</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-white/90">MCar</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <a
            href="/inspector"
            className="block px-3 py-2.5 text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            My Inspections
          </a>
        </nav>

        <div className="px-3 py-4">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left text-[13px] text-white/30 hover:text-red-400 transition-colors px-3 py-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
