// app/coach/programs/generate/page.tsx
// Redirect to new multi-sport program wizard
import { redirect } from 'next/navigation'

export default async function GenerateProgramPage() {
  // Redirect to the new multi-sport wizard
  redirect('/coach/programs/new')
}
