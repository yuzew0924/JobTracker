import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { createJob, deleteJob, getJob, listJobs, updateJob } from './lib/jobs'
import { getSupabase, supabase } from './lib/supabase'
import { JOB_STATUSES, type Job, type JobInput, type JobStatus } from './types/job'

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '操作失败，请稍后重试。'
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'signed-in' | 'signed-out' | 'missing-config'>(supabase ? 'loading' : 'missing-config')

  useEffect(() => {
    if (!supabase) return
    let active = true
    getSupabase().auth.getSession().then(({ data, error }) => {
      if (active) setState(error ? 'signed-out' : data.session ? 'signed-in' : 'signed-out')
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (active) setState(session ? 'signed-in' : 'signed-out')
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  if (state === 'loading') return <div className="screen-message">正在确认登录状态…</div>
  if (state === 'missing-config') return <div className="screen-message"><section className="notice-card"><span className="eyebrow">需要配置</span><h1>连接 Supabase</h1><p>复制 <code>.env.example</code> 为 <code>.env.local</code>，再填入项目 URL 和 anon key。</p></section></div>
  if (state === 'signed-out') return <div className="screen-message"><section className="notice-card"><span className="eyebrow">JobTracker</span><h1>请先登录</h1><p>登录后才能查看和管理你的求职记录。</p><a className="button button-primary" href="/login">前往登录 <span aria-hidden="true">↗</span></a></section></div>
  return <>{children}</>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><header className="topbar"><Link className="brand" to="/jobs"><span className="brand-mark">J</span><span>job<span className="brand-light">tracker</span></span></Link><span className="topbar-label">求职进度，一目了然</span></header>{children}<footer className="app-footer">JOBTRACKER <span>·</span> 你的求职工作台</footer></div>
}

function App() {
  return <AuthGate><Shell><Routes>
    <Route path="/" element={<Navigate to="/jobs" replace />} />
    <Route path="/jobs" element={<JobListPage />} />
    <Route path="/jobs/new" element={<JobFormPage />} />
    <Route path="/jobs/:jobId" element={<JobDetailPage />} />
    <Route path="/jobs/:jobId/edit" element={<JobFormPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Shell></AuthGate>
}

function JobListPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setJobs(await listJobs()) } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    listJobs().then(data => { if (active) setJobs(data) }).catch(err => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const counts = JOB_STATUSES.map(status => ({ status, count: jobs.filter(job => job.status === status).length }))

  return <main className="page-wrap">
    <div className="page-heading"><div><span className="eyebrow">YOUR PIPELINE</span><h1>求职记录</h1><p>把每一次申请和下一步计划都整理好。</p></div><Link className="button button-primary" to="/jobs/new"><span className="plus">＋</span> 添加职位</Link></div>
    <section className="summary-row" aria-label="状态统计">{counts.map(item => <div className="summary-item" key={item.status}><span className={`status-dot dot-${item.status.toLowerCase()}`} /><span>{item.status}</span><strong>{item.count}</strong></div>)}</section>
    {error && <div className="alert alert-error" role="alert">{error}<button className="text-button" onClick={() => void refresh()}>重试</button></div>}
    {loading ? <div className="loading-card"><span className="spinner" />正在加载职位…</div> : jobs.length === 0 ? <section className="empty-state"><div className="empty-icon">✳</div><span className="eyebrow">从这里开始</span><h2>还没有求职记录</h2><p>记录你感兴趣的机会，持续跟进申请进度。</p><Link className="button button-primary" to="/jobs/new">添加第一个职位 <span aria-hidden="true">→</span></Link></section> : <section className="job-list" aria-label="职位列表">{jobs.map(job => <JobCard key={job.id} job={job} />)}</section>}
  </main>
}

function JobCard({ job }: { job: Job }) {
  return <Link className="job-card" to={`/jobs/${job.id}`}>
    <div className="company-avatar" aria-hidden="true">{job.company_name.trim().slice(0, 1).toUpperCase()}</div>
    <div className="job-main"><div className="job-title-line"><h2>{job.position_title}</h2><StatusBadge status={job.status} /></div><p>{job.company_name}{job.location ? <><span className="meta-separator">·</span>{job.location}</> : null}</p></div>
    <div className="job-card-side"><span className="date-caption">{job.applied_date ? `申请于 ${formatDate(job.applied_date)}` : `更新于 ${formatDate(job.updated_at.slice(0, 10))}`}</span><span className="materials">Resume <b>—</b><i /> Cover Letter <b>—</b></span></div><span className="card-arrow" aria-hidden="true">↗</span>
  </Link>
}

function StatusBadge({ status }: { status: JobStatus }) { return <span className={`status-badge badge-${status.toLowerCase()}`}><span className="status-dot" />{status}</span> }

function JobDetailPage() {
  const { jobId = '' } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    let active = true
    getJob(jobId).then(value => { if (active) setJob(value) }).catch(err => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [jobId])
  async function handleDelete() {
    setDeleting(true); setError('')
    try { await deleteJob(jobId); navigate('/jobs', { replace: true }) } catch (err) { setError(errorMessage(err)); setDeleting(false) }
  }
  if (loading) return <main className="page-wrap"><div className="loading-card"><span className="spinner" />正在加载职位…</div></main>
  if (!job) return <NotFound detail={error || '该职位不存在，或你没有查看权限。'} />
  return <main className="page-wrap detail-page">
    <Link className="back-link" to="/jobs">← 返回职位列表</Link>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <div className="detail-heading"><div className="company-avatar avatar-large">{job.company_name.slice(0, 1).toUpperCase()}</div><div className="detail-title"><span className="eyebrow">JOB DETAILS</span><h1>{job.position_title}</h1><p>{job.company_name}{job.location ? ` · ${job.location}` : ''}</p></div><StatusBadge status={job.status} /></div>
    <div className="detail-actions"><Link className="button button-secondary" to={`/jobs/${job.id}/edit`}>编辑职位</Link><button className="button button-danger-quiet" onClick={() => setConfirmDelete(true)}>删除</button></div>
    <section className="detail-card"><div className="section-heading"><div><span className="eyebrow">OVERVIEW</span><h2>职位信息</h2></div></div>
      <div className="info-grid"><Info label="申请状态"><StatusBadge status={job.status} /></Info><Info label="工作地点">{job.location || '—'}</Info><Info label="申请截止日期">{formatDate(job.application_deadline) || '—'}</Info><Info label="申请日期">{formatDate(job.applied_date) || '—'}</Info><Info label="职位链接">{job.job_url ? <a href={job.job_url} target="_blank" rel="noreferrer">打开职位页面 ↗</a> : '—'}</Info><Info label="最近更新">{formatDate(job.updated_at.slice(0, 10))}</Info></div>
      <div className="long-field"><h3>职位描述</h3><p>{job.job_description || '暂未添加职位描述。'}</p></div><div className="long-field"><h3>备注</h3><p>{job.notes || '暂未添加备注。'}</p></div>
    </section>
    <section className="documents-placeholder"><div><span className="eyebrow">WEEK 2</span><h2>求职材料</h2><p>Resume 和 Cover Letter 上传功能将在下一阶段接入。</p></div><div className="placeholder-doc">Resume <b>—</b></div><div className="placeholder-doc">Cover Letter <b>—</b></div></section>
    {confirmDelete && <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span className="eyebrow">确认删除</span><h2 id="delete-title">删除这条职位记录？</h2><p>“{job.position_title} · {job.company_name}” 将被永久删除，此操作无法撤销。</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>取消</button><button className="button button-danger" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? '正在删除…' : '确认删除'}</button></div></section></div>}
  </main>
}

function Info({ label, children }: { label: string; children: React.ReactNode }) { return <div className="info-item"><span>{label}</span><strong>{children}</strong></div> }

function JobFormPage() {
  const { jobId } = useParams()
  const editing = Boolean(jobId)
  const navigate = useNavigate()
  const [initializing, setInitializing] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<JobInput>({ company_name: '', position_title: '', status: 'Interested', job_url: '', location: '', job_description: '', notes: '', application_deadline: '', applied_date: '' })

  useEffect(() => {
    if (!jobId) return
    let active = true
    getJob(jobId).then(job => {
      if (!active) return
      if (!job) { navigate('/not-found', { replace: true }); return }
      setValues({ company_name: job.company_name, position_title: job.position_title, status: job.status, job_url: job.job_url || '', location: job.location || '', job_description: job.job_description || '', notes: job.notes || '', application_deadline: job.application_deadline || '', applied_date: job.applied_date || '' })
    }).catch(err => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setInitializing(false) })
    return () => { active = false }
  }, [jobId, navigate])

  function setField<K extends keyof JobInput>(key: K, value: JobInput[K]) { setValues(current => ({ ...current, [key]: value })) }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!values.company_name.trim() || !values.position_title.trim()) { setError('请填写公司名称和职位名称。'); return }
    if (values.job_url && !/^https?:\/\//i.test(values.job_url)) { setError('职位链接请以 http:// 或 https:// 开头。'); return }
    const cleaned: JobInput = { ...values, company_name: values.company_name.trim(), position_title: values.position_title.trim(), job_url: values.job_url?.trim() || null, location: values.location?.trim() || null, job_description: values.job_description?.trim() || null, notes: values.notes?.trim() || null, application_deadline: values.application_deadline || null, applied_date: values.applied_date || null }
    setSaving(true)
    try { const job = editing && jobId ? await updateJob(jobId, cleaned) : await createJob(cleaned); navigate(`/jobs/${job.id}`, { replace: true }) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  if (initializing) return <main className="page-wrap"><div className="loading-card"><span className="spinner" />正在加载职位…</div></main>
  return <main className="page-wrap form-page"><Link className="back-link" to={editing && jobId ? `/jobs/${jobId}` : '/jobs'}>← 返回{editing ? '职位详情' : '职位列表'}</Link>
    <div className="form-heading"><span className="eyebrow">{editing ? 'UPDATE OPPORTUNITY' : 'NEW OPPORTUNITY'}</span><h1>{editing ? '编辑职位' : '添加职位'}</h1><p>先记下关键信息，之后也可以随时补充。</p></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <form className="job-form" onSubmit={handleSubmit}>
      <div className="form-section"><h2>基本信息</h2><div className="form-grid"><Field label="公司名称" required><input autoFocus value={values.company_name} onChange={e => setField('company_name', e.target.value)} placeholder="例如 Stripe" maxLength={120} required /></Field><Field label="职位名称" required><input value={values.position_title} onChange={e => setField('position_title', e.target.value)} placeholder="例如 Product Designer" maxLength={160} required /></Field><Field label="申请状态" required><select value={values.status} onChange={e => setField('status', e.target.value as JobStatus)}>{JOB_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field><Field label="工作地点"><input value={values.location || ''} onChange={e => setField('location', e.target.value)} placeholder="例如 San Francisco, CA" maxLength={160} /></Field><Field label="职位链接" wide><input type="url" value={values.job_url || ''} onChange={e => setField('job_url', e.target.value)} placeholder="https://company.com/careers/…" /></Field><Field label="申请截止日期"><input type="date" value={values.application_deadline || ''} onChange={e => setField('application_deadline', e.target.value)} /></Field><Field label="申请日期"><input type="date" value={values.applied_date || ''} onChange={e => setField('applied_date', e.target.value)} /></Field></div></div>
      <div className="form-section"><h2>补充信息 <span>选填</span></h2><div className="form-grid"><Field label="职位描述" wide><textarea rows={5} value={values.job_description || ''} onChange={e => setField('job_description', e.target.value)} placeholder="粘贴职位描述，方便之后查阅。" maxLength={12000} /></Field><Field label="备注" wide><textarea rows={4} value={values.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="记录联系人、后续跟进或面试准备事项。" maxLength={5000} /></Field></div></div>
      <div className="form-actions"><Link className="button button-secondary" to={editing && jobId ? `/jobs/${jobId}` : '/jobs'}>取消</Link><button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : editing ? '保存修改' : '创建职位'}</button></div>
    </form>
  </main>
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) { return <label className={`field${wide ? ' field-wide' : ''}`}><span>{label}{required && <em> *</em>}</span>{children}</label> }
function NotFound({ detail = '页面不存在。' }: { detail?: string }) { return <main className="page-wrap not-found"><span className="eyebrow">404</span><h1>找不到这条记录</h1><p>{detail}</p><Link className="button button-secondary" to="/jobs">返回职位列表</Link></main> }
function formatDate(value: string | null) { if (!value) return ''; const date = new Date(`${value.slice(0, 10)}T12:00:00`); return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date) }

export default App
