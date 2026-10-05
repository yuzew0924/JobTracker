import { redirect } from 'next/navigation'
import { AppShell } from '@/src/App'
import { createClient } from '@/lib/supabase/server'

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect('/login')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <AppShell email={user.email ?? ''}>{children}</AppShell>
}
