'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/auth-events'

export async function signOut() {
  const supabase = await createClient()

  // Capture user before sign out so we can log the event
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.auth.signOut()

  // Log the sign out (best-effort, doesn't block the redirect)
  if (user) {
    logAuthEvent({
      eventType: 'SIGN_OUT',
      userId: user.id,
      email: user.email,
    }).catch(() => { /* silent */ })
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
