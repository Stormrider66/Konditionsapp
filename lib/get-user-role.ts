// lib/get-user-role.ts
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@prisma/client'

/**
 * Client-side helper to fetch user role from API
 * This is used in client components to determine navigation
 */
export async function getUserRole(): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch user role from our API
    const response = await fetch('/api/users/me')
    if (!response.ok) return null

    const result = await response.json()
    return result.data?.role || null
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}
