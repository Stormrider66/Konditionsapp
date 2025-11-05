'use client'

import { useState } from 'react'
import { ReportData } from '@/types'
import { generateAndDownloadPDF } from '@/lib/pdf-generator'
import { Download, Loader2 } from 'lucide-react'

interface PDFExportButtonProps {
  reportData: ReportData
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PDFExportButton({
  reportData,
  variant = 'default',
  size = 'md',
  className = '',
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  const handleExportPDF = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      setProgress('Förbereder rapport...')

      // Vänta lite så användaren ser progress
      await new Promise(resolve => setTimeout(resolve, 300))

      setProgress('Genererar PDF...')

      // Generera och ladda ner PDF
      await generateAndDownloadPDF(reportData)

      setProgress('Klar!')

      // Rensa progress efter en kort stund
      setTimeout(() => {
        setProgress('')
        setIsGenerating(false)
      }, 1000)

    } catch (err) {
      console.error('Error generating PDF:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod vid PDF-generering')
      setIsGenerating(false)
      setProgress('')
    }
  }

  // Dynamiska styles baserat på variant och size
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

  const variantStyles = {
    default: 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:opacity-90 focus:ring-[#667eea]',
    outline: 'border-2 border-[#667eea] text-[#667eea] hover:bg-[#667eea] hover:text-white focus:ring-[#667eea]',
    ghost: 'text-[#667eea] hover:bg-[#667eea]/10 focus:ring-[#667eea]',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExportPDF}
        disabled={isGenerating}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        aria-label="Exportera som PDF"
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin" size={iconSize[size]} />
            <span>Genererar...</span>
          </>
        ) : (
          <>
            <Download size={iconSize[size]} />
            <span>Exportera PDF</span>
          </>
        )}
      </button>

      {/* Progress indicator */}
      {progress && (
        <p className="text-sm text-gray-600 text-center animate-pulse">
          {progress}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          <p className="font-semibold">Fel vid PDF-generering:</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
