import type { Metadata } from 'next'
import { ForAthletesPage } from '@/components/landing/ForAthletesPage'

export const metadata: Metadata = {
  title: 'For Athletes | Trainomics',
  description: 'AI-powered daily workouts, race predictions, and training zones based on your physiology. Train smarter with science-backed tools.',
}

export default function Page() {
  return <ForAthletesPage />
}
