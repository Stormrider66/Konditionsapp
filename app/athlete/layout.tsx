// app/athlete/layout.tsx
import { AthleteLayout } from '@/components/layouts/AthleteLayout'

export default function AthleteRoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AthleteLayout>{children}</AthleteLayout>
}
