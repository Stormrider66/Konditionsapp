// app/(business)/[businessSlug]/coach/exercises/ExerciseLibraryClient.tsx
'use client'

import dynamic from 'next/dynamic'

const ExerciseLibraryBrowser = dynamic(
  () => import('@/components/coach/exercise-library/ExerciseLibraryBrowser').then(mod => mod.ExerciseLibraryBrowser),
  { ssr: false, loading: () => <div className="p-8 text-center">Laddar övningsbibliotek...</div> }
)

export default function ExerciseLibraryClient() {
  return (
    <div className="container mx-auto py-6 px-4">
      <ExerciseLibraryBrowser mode="browse" />
    </div>
  )
}
