import { notFound } from 'next/navigation'
import { getJob } from '@/lib/jobs'
import { createClient } from '@/lib/supabase/server'
import { JobFormPage } from '@/src/App'

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const job = await getJob(supabase, jobId)

  if (!job) notFound()
  return <JobFormPage initialJob={job} />
}
