'use client'

import dynamic from 'next/dynamic'

const ExerciseLibraryBrowser = dynamic(
  () => import('@/components/coach/exercise-library/ExerciseLibraryBrowser').then(mod => mod.ExerciseLibraryBrowser),
  { ssr: false, loading: () => <div className="p-8 text-center">Laddar övningsbibliotek...</div> }
)

export default function ExerciseLibraryPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <ExerciseLibraryBrowser mode="browse" />
    </div>
  )
}
