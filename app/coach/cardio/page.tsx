import { Metadata } from 'next'
import { CardioDashboard } from '@/components/coach/cardio/CardioDashboard'

export const metadata: Metadata = {
  title: 'Cardio Studio | Konditionstest',
  description: 'Advanced cardio training management and programming',
}

export default function CardioPage() {
  return <CardioDashboard />
}

