import { redirect } from 'next/navigation'
import { AuthPage } from '@/src/App'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <AuthPage mode="login" />
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/jobs')
  return <AuthPage mode="login" />
}
