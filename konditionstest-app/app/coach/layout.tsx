// app/coach/layout.tsx
import { CoachLayout } from '@/components/layouts/CoachLayout'

export default function CoachRoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CoachLayout>{children}</CoachLayout>
}
