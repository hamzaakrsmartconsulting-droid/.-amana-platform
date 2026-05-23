import AdminLayoutClient from './admin-layout-client'

/** Évite le prérendu statique au build (Supabase requis dans le shell admin). */
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
