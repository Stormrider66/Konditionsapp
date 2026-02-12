'use client'

import type { ReactNode } from 'react'

interface Feature {
  icon: ReactNode
  title: string
  description: string
}

interface FeatureShowcaseProps {
  title: string
  description: string
  features: Feature[]
  columns?: 2 | 3
}

export function FeatureShowcase({ title, description, features, columns = 3 }: FeatureShowcaseProps) {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">{title}</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">{description}</p>
        </div>

        <div className={`grid md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-8`}>
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
