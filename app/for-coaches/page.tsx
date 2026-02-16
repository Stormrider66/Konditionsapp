import type { Metadata } from 'next'
import { ForCoachesPage } from '@/components/landing/ForCoachesPage'

export const metadata: Metadata = {
  title: 'For Coaches | Trainomics',
  description: 'AI studio, program builder, test reports, and athlete monitoring. Scale your coaching with science-backed tools.',
}

export default function Page() {
  return <ForCoachesPage />
}
