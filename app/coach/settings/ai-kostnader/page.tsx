import { AICostInfoClient } from './AICostInfoClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'AI-kostnader | Coach',
  description: 'Översikt av AI-kostnader per atlet',
}

export default async function CoachAICostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AICostInfoClient />
}
