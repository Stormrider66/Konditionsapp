// app/(business)/[businessSlug]/coach/exercises/ExerciseLibraryClient.tsx
'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from '@/i18n/client'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'

function ExerciseLibraryLoading() {
  const t = useTranslations('coach.pages.exerciseLibrary')

  return <div className="p-8 text-center">{t('loading')}</div>
}

const ExerciseLibraryBrowser = dynamic(
  () => import('@/components/coach/exercise-library/ExerciseLibraryBrowser').then(mod => mod.ExerciseLibraryBrowser),
  { ssr: false, loading: ExerciseLibraryLoading }
)

export default function ExerciseLibraryClient() {
  return (
    <RolePageFrame maxWidth="wide">
      <ExerciseLibraryBrowser mode="browse" />
    </RolePageFrame>
  )
}
