import { QuickErgSessionDetailPage } from '@/components/athlete/quick-erg/QuickErgSessionDetailPage'

interface AthleteQuickErgSessionPageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteQuickErgSessionPage({ params }: AthleteQuickErgSessionPageProps) {
  const { id } = await params

  return <QuickErgSessionDetailPage id={id} />
}
