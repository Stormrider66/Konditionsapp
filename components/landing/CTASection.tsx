'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

interface CTASectionProps {
  title: string
  description: string
  buttonText: string
  buttonHref: string
  subText?: string
}

export function CTASection({ title, description, buttonText, buttonHref, subText }: CTASectionProps) {
  const isExternal = buttonHref.startsWith('mailto:') || buttonHref.startsWith('http')

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">{title}</h2>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          {description}
        </p>
        {isExternal ? (
          <a href={buttonHref}>
            <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100">
              {buttonText}
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
        ) : (
          <Link href={buttonHref}>
            <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100">
              {buttonText}
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        )}
        {subText && (
          <p className="mt-6 text-sm text-slate-400">
            {subText}
          </p>
        )}
      </div>
    </section>
  )
}
