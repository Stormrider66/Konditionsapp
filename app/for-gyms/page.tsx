import type { Metadata } from 'next'
import { ForGymsPage } from '@/components/landing/ForGymsPage'

export const metadata: Metadata = {
  title: 'For Gyms & Studios | Trainomics',
  description: 'Team management, multi-coach access, custom branding, and performance testing as a revenue stream for your gym.',
}

export default function Page() {
  return <ForGymsPage />
}
