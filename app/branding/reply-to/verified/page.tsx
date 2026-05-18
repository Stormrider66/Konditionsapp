// app/branding/reply-to/verified/page.tsx
//
// Status landing for the click-to-verify reply-to flow. Reads ?status=ok|error
// and ?message=... from the redirect produced by the verify route.
import Link from 'next/link'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  searchParams: Promise<{ status?: string; message?: string }>
}

export default async function ReplyToVerifiedPage({ searchParams }: PageProps) {
  const { status, message } = await searchParams
  const ok = status === 'ok'
  const t = await getTranslations('pages.replyToVerified')
  const tCommon = await getTranslations('common')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white dark:bg-slate-900/60 dark:border-white/10 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          {ok ? (
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <h1 className="text-xl font-semibold dark:text-white">
          {ok ? t('titleSuccess') : t('titleError')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || (ok ? t('messageSuccess') : t('messageError'))}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('returnToHome', { appName: tCommon('appName') })}
        </Link>
      </div>
    </div>
  )
}
