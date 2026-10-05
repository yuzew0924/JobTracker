export const JOB_STATUSES = ['Interested', 'Preparing', 'Applied', 'Interview', 'Offer', 'Rejected'] as const
export type JobStatus = typeof JOB_STATUSES[number]
export type Job = { id: string; user_id: string; company_name: string; position_title: string; job_url: string | null; location: string | null; status: JobStatus; job_description: string | null; notes: string | null; application_deadline: string | null; applied_date: string | null; created_at: string; updated_at: string }
export type JobInput = Pick<Job, 'company_name' | 'position_title' | 'status'> & Partial<Pick<Job, 'job_url' | 'location' | 'job_description' | 'notes' | 'application_deadline' | 'applied_date'>>
