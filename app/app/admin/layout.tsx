import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

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
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin</p>
          <p className="mt-1 text-base font-bold text-gray-900">MCar CRM</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/leads">Leads</NavLink>
          <NavLink href="/admin/calendar">Calendar</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded"
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
      className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {children}
    </Link>
  )
}
