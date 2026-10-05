import type { Metadata } from 'next'
import '../src/index.css'

// oxlint-disable-next-line react/only-export-components -- Next.js reads metadata from the root layout module.
export const metadata: Metadata = {
  title: 'Jobfolio — A simpler way to job search',
  description: 'Keep every job application in one organized place with Jobfolio.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
