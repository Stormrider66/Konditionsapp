import { Metadata } from 'next'
import { StrengthDashboard } from '@/components/coach/strength/StrengthDashboard'

export const metadata: Metadata = {
  title: 'Strength Studio | Konditionstest',
  description: 'Advanced strength training management and programming',
}

export default function StrengthPage() {
  return <StrengthDashboard />
}

