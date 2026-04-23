import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import RightPanel from '@/components/layout/RightPanel'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />

      <main
        className="transition-all duration-300"
        style={{
          paddingTop: 'var(--header-height)',
          paddingLeft: 'var(--sidebar-width)',
          paddingRight: 'var(--right-panel-collapsed-width)',
        }}
      >
        <div className="p-6 min-h-[calc(100vh-var(--header-height))]">
          {children}
        </div>
      </main>

      <RightPanel />
    </div>
  )
}
