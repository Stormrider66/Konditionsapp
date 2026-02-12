'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface SegmentCardProps {
  icon: ReactNode
  title: string
  description: string
  href: string
  gradient: string
  learnMore: string
}

export function SegmentCard({ icon, title, description, href, gradient, learnMore }: SegmentCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
        <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-4 text-white`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{description}</p>
        <span className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
          {learnMore}
          <ArrowRight className="w-4 h-4 ml-1" />
        </span>
      </div>
    </Link>
  )
}
