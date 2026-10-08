'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { createJob, deleteJob, listJobs, updateJob } from '@/lib/jobs'
import { createClient } from '@/lib/supabase/client'
import { JOB_STATUSES, type Job, type JobInput, type JobStatus } from '@/lib/types/job'

function Link({ to, href, ...props }: Omit<ComponentProps<typeof NextLink>, 'href'> & { to?: string; href?: string }) { return <NextLink href={href ?? to ?? '/'} {...props} /> }
function useNavigate() { const router = useRouter(); return (path: string, options?: { replace?: boolean }) => options?.replace ? router.replace(path) : router.push(path) }
function getSupabase() { return createClient() }

const icons = { jobs: '▣', account: '♙', search: '⌕', logout: '↪', back: '←', plus: '+', pin: '⌖', calendar: '□', file: '▤', edit: '✎', trash: '♲', mail: '✉', lock: '▣', eye: '◉', more: '•••' } as const
function Icon({ name }: { name: keyof typeof icons }) { return <span className={`icon icon-${name}`} aria-hidden="true">{icons[name]}</span> }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.' }
function Logo({ compact = false }: { compact?: boolean }) { return <Link className={`logo${compact ? ' logo-compact' : ''}`} to="/"><span className="leaf-mark"><i /><i /></span><span>Jobfolio</span></Link> }

export function LandingPage() {
  return <div className="landing-page"><header className="landing-nav"><Logo /><nav><Link to="/login">Log in</Link><Link className="primary-button" to="/register">Create account</Link></nav></header><main className="landing-main"><section className="hero-copy"><span className="kicker">A SIMPLER WAY TO JOB SEARCH</span><h1>Keep every job<br />application in one place.</h1><p>Save job details, and keep your current resume and cover letter with each application — so you’re always organized and ready.</p><div className="hero-actions"><Link className="primary-button large" to="/register">Get started <span>→</span></Link><Link className="outline-button large" to="/login">Log in</Link></div><small>No credit card required. Just a simpler job search.</small></section><DashboardPreview /></main><section className="feature-row"><Feature icon="⌕" title="Track jobs">Save key details like company, role, status and date — all in one place.</Feature><Feature icon="▤" title="Keep documents together">Attach one current resume and one current cover letter to each job.</Feature><Feature icon="▣" title="Private by default">Your data is yours. We keep it simple, secure and out of the spotlight.</Feature></section><div className="landing-footer"><i />A more organized job search starts here.<i /></div></div>
}
function Feature({ icon, title, children }: { icon: string; title: string; children: ReactNode }) { return <article className="feature"><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{children}</p></article> }
function DashboardPreview() { const rows = [['Spotify','Product Designer','Applied','Apr 12, 2024'],['Notion','UX Designer','Interview','Apr 3, 2024'],['Airbnb','Product Designer','Applied','Mar 28, 2024'],['Google','UX Researcher','Saved','Mar 20, 2024']]; return <section className="dashboard-preview"><div className="preview-head"><Logo compact /><span className="avatar">JD</span></div><div className="preview-title"><h2>My Applications</h2><span className="primary-button small">＋ Add job</span></div><div className="preview-table"><div className="preview-row preview-labels"><span>Company</span><span>Role</span><span>Status</span><span>Applied</span></div>{rows.map((row, index) => <div className="preview-row" key={row[0]}><span className="preview-company"><b className={`company-dot c${index}`}>{row[0][0]}</b><strong>{row[0]}</strong></span><span>{row[1]}</span><em>{row[2]}</em><span>{row[3]}</span></div>)}</div><small>4 applications</small></section> }

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate(), registering = mode === 'register'
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [visible, setVisible] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setMessage(''); if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) { setError('Supabase is not configured. Add your project keys to .env.local.'); return } if (registering && password !== confirmPassword) { setError('Passwords do not match.'); return } if (password.length < 8) { setError('Password must be at least 8 characters.'); return } setLoading(true); try { if (registering) { const { data, error: authError } = await getSupabase().auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } }); if (authError) throw authError; if (data.session) navigate('/jobs', { replace: true }); else setMessage('Check your email to confirm your account, then log in.') } else { const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password }); if (authError) throw authError; navigate('/jobs', { replace: true }) } } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) } }
  async function forgotPassword() { if (!email) { setError('Enter your email first.'); return } if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setError('Supabase is not configured.'); return } const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email); setMessage(resetError ? '' : 'Password reset email sent.'); setError(resetError?.message || '') }
  return <main className={`auth-page auth-${mode}`}><Link className="auth-back" to="/" aria-label="Back to home"><Icon name="back" />Back to home</Link><div className="auth-brand"><Logo /><span>{registering ? 'A simpler way to track your job search' : "A CLEARER PATH FOR WHAT'S NEXT"}</span></div><div className="botanical botanical-left" /><div className="botanical botanical-right" />{!registering && <aside className="auth-quote"><strong>Same resume.<br />Further opportunities.</strong><i /><p>Keep track. Stay organized.<br />Move forward.</p></aside>}<form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>{registering ? 'Create your account' : 'Welcome back'}</h1><p>{registering ? 'Start tracking your job applications in one place.' : 'Log in to your Jobfolio account'}</p></div><AuthField label="Email"><div className="input-with-icon">{!registering && <Icon name="mail" />}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></div></AuthField><AuthField label="Password"><div className="input-with-icon">{!registering && <Icon name="lock" />}<input type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={registering ? 'Create a strong password' : 'Enter your password'} required autoComplete={registering ? 'new-password' : 'current-password'} /><button type="button" className="eye-button" onClick={() => setVisible(v => !v)}><Icon name="eye" /></button></div>{registering && <small>Use at least 8 characters, with a mix of letters, numbers and symbols.</small>}</AuthField>{registering && <AuthField label="Confirm password"><div className="input-with-icon"><input type={visible ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required autoComplete="new-password" /><button type="button" className="eye-button" onClick={() => setVisible(v => !v)}><Icon name="eye" /></button></div></AuthField>}{!registering && <button className="forgot-button" type="button" onClick={() => void forgotPassword()}>Forgot password?</button>}{error && <div className="form-message error">{error}</div>}{message && <div className="form-message success">{message}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : registering ? 'Create account' : 'Log in'}</button><div className="auth-switch">{registering ? 'Already have an account?' : 'New to Jobfolio?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Log in' : 'Create an account'}</Link></div></form></main>
}
function AuthField({ label, children }: { label: string; children: ReactNode }) { return <label className="auth-field"><span>{label}</span>{children}</label> }

export function AppShell({ children, email }: { children: ReactNode; email: string }) { const router = useRouter(); async function signOut() { await getSupabase().auth.signOut(); router.replace('/login'); router.refresh() } return <div className="app-layout"><aside className="sidebar"><Logo /><nav><Link className="active" to="/jobs"><Icon name="jobs" />Jobs</Link><span><Icon name="account" />Account</span></nav><div className="sidebar-user"><p>{email}</p><button onClick={() => void signOut()}><Icon name="logout" />Log out</button></div></aside><div className="app-content">{children}</div></div> }

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState(''), [status, setStatus] = useState('All')
  useEffect(() => { let active = true; listJobs(getSupabase()).then(data => { if (active) setJobs(data) }).catch(err => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const filtered = useMemo(() => jobs.filter(job => (status === 'All' || job.status === status) && `${job.company_name} ${job.position_title}`.toLowerCase().includes(query.toLowerCase())), [jobs, query, status])
  return <main className="workspace jobs-page"><header className="workspace-heading"><div><h1>My Jobs</h1><p>Track every opportunity and keep its files together.</p></div><Link className="primary-button add-button" to="/jobs/new"><Icon name="plus" />Add job</Link></header><div className="filters"><label className="search-box"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies or positions..." /></label><label className="status-filter"><span>Status</span><select value={status} onChange={e => setStatus(e.target.value)}><option>All</option>{JOB_STATUSES.map(value => <option key={value}>{value}</option>)}</select></label></div>{error && <div className="form-message error">{error}</div>}{loading ? <div className="loading-panel"><span className="spinner" />Loading jobs…</div> : <JobsTable jobs={filtered} total={jobs.length} />}</main>
}
function JobsTable({ jobs, total }: { jobs: Job[]; total: number }) { return <section className="jobs-table"><div className="jobs-row jobs-labels"><span>Company</span><span>Position</span><span>Status</span><span>Location</span><span>Applied date</span><span>Resume</span><span>Cover letter</span><span>Actions</span></div>{jobs.length ? jobs.map(job => <Link className="jobs-row jobs-data" to={`/jobs/${job.id}`} key={job.id}><span className="company-cell"><b>{job.company_name[0]?.toUpperCase()}</b><strong>{job.company_name}</strong></span><span>{job.position_title}</span><span><StatusBadge status={job.status} /></span><span>{job.location || '—'}</span><span>{formatDate(job.applied_date) || '—'}</span><DocumentState /><DocumentState /><span className="more-cell"><Icon name="more" /></span></Link>) : <div className="empty-jobs"><h2>No jobs found</h2><p>{total ? 'Try changing your search or status filter.' : 'Add your first opportunity to get started.'}</p></div>}<footer>Showing {jobs.length} of {total} jobs</footer></section> }
function DocumentState() { return <span className="document-state missing"><i>−</i>Missing</span> }
function StatusBadge({ status }: { status: JobStatus }) { return <span className={`status-pill status-${status.toLowerCase()}`}><i />{status}</span> }

function jobToInput(job: Job): JobInput {
  return {
    company_name: job.company_name,
    position_title: job.position_title,
    status: job.status,
    job_url: job.job_url || '',
    location: job.location || '',
    job_description: job.job_description || '',
    notes: job.notes || '',
    application_deadline: job.application_deadline || '',
    applied_date: job.applied_date || '',
  }
}

export function JobFormPage({ initialJob }: { initialJob?: Job }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [values, setValues] = useState<JobInput>(() => initialJob ? jobToInput(initialJob) : { company_name: '', position_title: '', status: 'Interested', job_url: '', location: '', job_description: '', notes: '', application_deadline: '', applied_date: '' })
  function setField<K extends keyof JobInput>(key: K, value: JobInput[K]) { setValues(current => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(''); try { const cleaned = { ...values, company_name: values.company_name.trim(), position_title: values.position_title.trim(), job_url: values.job_url?.trim() || null, location: values.location?.trim() || null, job_description: values.job_description?.trim() || null, notes: values.notes?.trim() || null, application_deadline: values.application_deadline || null, applied_date: values.applied_date || null }; const job = initialJob ? await updateJob(getSupabase(), initialJob.id, cleaned) : await createJob(getSupabase(), cleaned); navigate(`/jobs/${job.id}`) } catch (err) { setError(errorMessage(err)); setSaving(false) } }
  return <main className="workspace form-workspace"><Link className="back-link" to={initialJob ? `/jobs/${initialJob.id}` : '/jobs'}><Icon name="back" />Back to {initialJob ? 'job' : 'jobs'}</Link><header className="form-title"><h1>{initialJob ? 'Edit job' : 'Add a job'}</h1><p>{initialJob ? 'Update the details for this job application.' : 'Track a new opportunity and keep your application details in one place.'}</p></header><form className="job-form" onSubmit={submit}>{error && <div className="form-message error">{error}</div>}<div className="form-grid"><Field label="Company name" required><input autoFocus value={values.company_name} onChange={e => setField('company_name', e.target.value)} placeholder="e.g. Acme Inc." required /></Field><Field label="Position title" required><input value={values.position_title} onChange={e => setField('position_title', e.target.value)} placeholder="e.g. Software Engineer" required /></Field><Field label={initialJob ? 'Job posting URL' : 'Job URL'} wide={Boolean(initialJob)}><input type="url" value={values.job_url || ''} onChange={e => setField('job_url', e.target.value)} placeholder="https://..." /></Field><Field label="Location"><input value={values.location || ''} onChange={e => setField('location', e.target.value)} placeholder="e.g. San Francisco, CA or Remote" /></Field><Field label="Status" required><select value={values.status} onChange={e => setField('status', e.target.value as JobStatus)}>{JOB_STATUSES.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Application deadline"><input type="date" value={values.application_deadline || ''} onChange={e => setField('application_deadline', e.target.value)} /></Field><Field label="Applied date"><input type="date" value={values.applied_date || ''} onChange={e => setField('applied_date', e.target.value)} /></Field><Field label="Job description" wide><textarea rows={5} value={values.job_description || ''} onChange={e => setField('job_description', e.target.value)} placeholder="Paste the job description here..." /></Field><Field label="Notes" wide><textarea rows={4} value={values.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Add any notes about this job..." /></Field></div><div className="form-actions"><Link className="outline-button" to={initialJob ? `/jobs/${initialJob.id}` : '/jobs'}>Cancel</Link><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : initialJob ? 'Save changes' : 'Create job'}</button></div></form></main>
}
function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: ReactNode }) { return <label className={`field${wide ? ' field-wide' : ''}`}><span>{label}{required && <em> *</em>}</span>{children}</label> }

export function JobDetailPage({ initialJob }: { initialJob: Job }) {
  const navigate = useNavigate()
  const [error, setError] = useState(''), [confirming, setConfirming] = useState(false)
  const job = initialJob
  async function remove() { try { await deleteJob(getSupabase(), job.id); navigate('/jobs') } catch (err) { setError(errorMessage(err)) } }
  return <main className="workspace detail-workspace"><Link className="back-link" to="/jobs"><Icon name="back" />Back to jobs</Link><header className="detail-hero"><span className="company-logo-large">{job.company_name[0]?.toUpperCase()}</span><div><div className="detail-title-row"><h1>{job.position_title}</h1><StatusBadge status={job.status} /></div><h2>{job.company_name}</h2><p><span><Icon name="pin" />{job.location || 'No location'}</span><span><Icon name="calendar" />{job.applied_date ? `Applied on ${formatDate(job.applied_date)}` : 'Not applied yet'}</span></p></div><div className="detail-buttons"><Link className="primary-button" to={`/jobs/${job.id}/edit`}><Icon name="edit" />Edit job</Link><button className="danger-button" onClick={() => setConfirming(true)}><Icon name="trash" />Delete</button></div></header>{error && <div className="form-message error">{error}</div>}<div className="detail-columns"><div className="detail-left"><InfoCard title="Job information"><dl><dt>Job URL</dt><dd>{job.job_url ? <a href={job.job_url} target="_blank" rel="noreferrer">{job.job_url} ↗</a> : '—'}</dd><dt>Application deadline</dt><dd>{formatDate(job.application_deadline) || '—'}</dd><dt>Date applied</dt><dd>{formatDate(job.applied_date) || '—'}</dd><dt>Last updated</dt><dd>{formatDate(job.updated_at) || '—'}</dd></dl></InfoCard><TextCard title="Job description" text={job.job_description || 'No job description added.'} /><TextCard title="Notes" text={job.notes || 'No notes added.'} footer={`Last updated ${formatDate(job.updated_at)}`} /></div><div className="detail-right"><DocumentCard title="Resume" /><DocumentCard title="Cover letter" /></div></div>{confirming && <div className="modal"><section><h2>Delete this job?</h2><p>This action cannot be undone.</p><div><button className="outline-button" onClick={() => setConfirming(false)}>Cancel</button><button className="danger-button solid" onClick={() => void remove()}>Delete job</button></div></section></div>}</main>
}
function InfoCard({ title, children }: { title: string; children: ReactNode }) { return <section className="detail-card"><h3>{title}</h3>{children}</section> }
function TextCard({ title, text, footer }: { title: string; text: string; footer?: string }) { return <InfoCard title={title}><p className="long-text">{text}</p>{footer && <small className="card-footer">{footer}</small>}</InfoCard> }
function DocumentCard({ title }: { title: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const inputId = `document-${title.toLowerCase().replaceAll(' ', '-')}`

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0]
    if (!selected) return
    const extension = selected.name.toLowerCase().split('.').pop()
    if (extension !== 'pdf' && extension !== 'docx') {
      setFile(null)
      setError('Choose a PDF or DOCX file.')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null)
      setError('The file must be 10 MB or smaller.')
      return
    }
    setError('')
    setFile(selected)
  }

  return <section className="detail-card document-card">
    <h3><Icon name="file" />{title}</h3>
    <div className={`upload-empty${file ? ' upload-selected' : ''}`}>
      {file ? <>
        <span className="selected-file-icon"><Icon name="file" /></span>
        <strong className="selected-file-name" title={file.name}>{file.name}</strong>
        <p>{formatFileSize(file.size)} · ready when storage is connected</p>
        <div className="file-actions">
          <label className="outline-button file-picker" htmlFor={inputId}>Choose another</label>
          <button className="file-remove" type="button" onClick={() => { setFile(null); setError('') }}>Remove</button>
        </div>
        <small>This selection is local only. Uploading will be enabled after private storage is configured.</small>
      </> : <>
        <Icon name="file" />
        <strong>No {title.toLowerCase()} uploaded</strong>
        <p>Choose a file to prepare it for this job.</p>
        <label className="primary-button file-picker" htmlFor={inputId}>Choose file</label>
        <small>PDF or DOCX, up to 10 MB</small>
      </>}
      <input className="file-input-hidden" id={inputId} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={selectFile} onClick={event => { event.currentTarget.value = '' }} />
    </div>
    {error && <p className="file-error" role="alert">{error}</p>}
  </section>
}
function formatDate(value: string | null) { if (!value) return ''; const date = new Date(`${value.slice(0, 10)}T12:00:00`); return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date) }
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB` }
