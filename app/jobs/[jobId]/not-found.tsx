import Link from 'next/link'

export default function JobNotFound() {
  return (
    <main className="workspace job-not-found">
      <span className="not-found-code">404</span>
      <h1>Job not found</h1>
      <p>This job doesn’t exist or you don’t have access to it.</p>
      <Link className="primary-button" href="/jobs">Back to jobs</Link>
    </main>
  )
}
