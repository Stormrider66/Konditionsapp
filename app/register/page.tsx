import { redirect } from 'next/navigation'

/**
 * Legacy register page — redirects to unified signup flow.
 * Kept so old bookmarks and links still work.
 */
export default function RegisterPage() {
  redirect('/signup/coach')
}
