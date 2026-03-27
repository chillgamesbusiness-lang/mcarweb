import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Role-level guard — middleware already blocked unauthenticated users;
  // this prevents an inspector account from reaching /admin.
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

  if (profile?.role !== 'admin') redirect('/login')
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-warm-border flex flex-col">
        <div className="px-5 py-5 border-b border-warm-border-light">
          <p className="text-xs font-semibold uppercase tracking-widest text-warm-gray">Admin</p>
          <p className="mt-1 text-base font-bold text-charcoal">MCar CRM</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/leads">Leads</NavLink>
          <NavLink href="/admin/calendar">Calendar</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-warm-border-light">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left text-sm text-warm-gray hover:text-red-600 transition-colors px-2 py-1.5 rounded"
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm font-medium text-charcoal-light hover:bg-surface-warm hover:text-charcoal transition-colors"
    >
      {children}
    </Link>
  )
}
