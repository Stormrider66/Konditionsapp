'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function AthleteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const businessSlug = params?.businessSlug as string

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Något gick fel</CardTitle>
              <CardDescription>
                Ett oväntat fel uppstod. Försök igen eller gå tillbaka till dashboarden.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Fel-ID: {error.digest}
            </p>
          )}

          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </Button>
            <Button asChild variant="default" className="flex items-center gap-2">
              <Link href={`/${businessSlug}/athlete/dashboard`}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
