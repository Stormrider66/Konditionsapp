import { cn } from "@/lib/utils"
import React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    gradient?: boolean
    glow?: 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'teal' | 'slate' | 'none'
}

export function GlassCard({ children, className, gradient = false, glow = 'none', ...props }: GlassCardProps) {
    const glowShadows = {
        none: '',
        blue: 'hover:shadow-blue-500/10 hover:border-blue-500/30',
        emerald: 'hover:shadow-emerald-500/10 hover:border-emerald-500/30',
        purple: 'hover:shadow-purple-500/10 hover:border-purple-500/30',
        amber: 'hover:shadow-amber-500/10 hover:border-amber-500/30',
        red: 'hover:shadow-red-500/10 hover:border-red-500/30',
        teal: 'hover:shadow-teal-500/10 hover:border-teal-500/30',
        slate: 'hover:shadow-slate-500/10 hover:border-slate-500/30',
    }

    return (
        <div
            className={cn(
                // Base layout
                "overflow-hidden relative shadow-xl backdrop-blur-xl transition-all duration-300 rounded-[2rem] border border-slate-200/80 dark:border-white/10",

                // Dark mode
                "dark:bg-slate-900/60 dark:ring-1 dark:ring-white/10 dark:shadow-slate-900/20",

                // Light mode
                "bg-white/85 shadow-slate-200/50",

                // Gradient options
                gradient && "dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-950/80 bg-gradient-to-br from-white/80 to-slate-50/80",

                glow !== 'none' && glowShadows[glow],
                className
            )}
            {...props}
        >
            {/* Background radial glow */}
            {glow !== 'none' && (
                <div className={cn(
                    "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity duration-300 group-hover:opacity-25",
                    glow === 'blue' && 'bg-blue-500',
                    glow === 'emerald' && 'bg-emerald-500',
                    glow === 'purple' && 'bg-purple-500',
                    glow === 'amber' && 'bg-amber-500',
                    glow === 'red' && 'bg-red-500',
                    glow === 'teal' && 'bg-teal-500',
                    glow === 'slate' && 'bg-slate-500'
                )} />
            )}

            {/* Optional top shine effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/5 dark:via-white/20 to-transparent opacity-50" />

            {children}
        </div>
    )
}

export function GlassCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

export function GlassCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn("font-semibold leading-none tracking-tight text-slate-900 dark:text-white transition-colors", className)} {...props} />
}

export function GlassCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function GlassCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors", className)} {...props} />
}

export function GlassCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
}
