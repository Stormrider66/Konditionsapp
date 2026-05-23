import { AcuteReportsClient } from '@/components/physio/AcuteReportsClient'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessPhysioAcuteReportsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const basePath = `/${businessSlug}/physio`

  return <AcuteReportsClient basePath={basePath} />
}
