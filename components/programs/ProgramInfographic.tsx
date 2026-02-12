'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from '@/i18n/client'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ProgramInfographicProps {
  programId: string
  infographicUrl?: string | null
  infographicModel?: string | null
  readOnly?: boolean
}

const MODELS = [
  { value: 'gemini-2.5-flash-image', labelKey: 'modelFlash' as const },
  { value: 'gemini-3-pro-image-preview', labelKey: 'modelPro' as const },
]

export function ProgramInfographic({
  programId,
  infographicUrl,
  infographicModel,
  readOnly = false,
}: ProgramInfographicProps) {
  const t = useTranslations('infographic')
  const [url, setUrl] = useState(infographicUrl || null)
  const [model, setModel] = useState(
    infographicModel || 'gemini-2.5-flash-image'
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, model }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate')
      }

      const data = await res.json()
      setUrl(data.url)
      toast.success(t('success'))
    } catch (err) {
      toast.error(t('error'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `program-infographic-${programId}.png`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Read-only: hide entirely if no infographic
  if (readOnly && !url) return null

  return (
    <GlassCard className="rounded-2xl">
      <GlassCardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white text-slate-900">
            {t('title')}
          </h3>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {t(m.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t('generating')}
                  </>
                ) : url ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    {t('regenerate')}
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-1.5 h-4 w-4" />
                    {t('generate')}
                  </>
                )}
              </Button>

              {url && (
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {readOnly && url && (
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('download')}
            </Button>
          )}
        </div>

        {url ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
            <Image
              src={url}
              alt={t('title')}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : !readOnly ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">{t('empty')}</p>
            <p className="text-xs mt-1">{t('emptyAction')}</p>
          </div>
        ) : null}
      </GlassCardContent>
    </GlassCard>
  )
}
