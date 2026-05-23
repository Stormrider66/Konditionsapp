import { AcuteReportDetailClient } from '@/components/physio/AcuteReportDetailClient'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessPhysioAcuteReportDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const basePath = `/${businessSlug}/physio`

  return <AcuteReportDetailClient basePath={basePath} reportId={id} />
}
