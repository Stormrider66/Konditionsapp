import type { Metadata } from 'next'
import { ForClubsPage } from '@/components/landing/ForClubsPage'

export const metadata: Metadata = {
  title: 'For Sports Clubs | Star by Thomson',
  description: 'Batch testing, team leaderboards, ACWR injury monitoring, and season periodization for sports clubs and federations.',
}

export default function Page() {
  return <ForClubsPage />
}
