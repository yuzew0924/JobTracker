import { redirect } from 'next/navigation'
import { AuthPage } from '@/src/App'
import { createClient } from '@/lib/supabase/server'

export default async function RegisterPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <AuthPage mode="register" />
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/jobs')
  return <AuthPage mode="register" />
}
