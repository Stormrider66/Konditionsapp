import { cn } from "@/lib/utils"
import React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    gradient?: boolean
}

export function GlassCard({ children, className, gradient = false, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                // Base layout
                "overflow-hidden relative shadow-xl backdrop-blur-xl transition-colors duration-300",

                // Dark Mode (Fitapp Mörk)
                "dark:bg-slate-900/60 dark:ring-1 dark:ring-white/10 dark:shadow-slate-900/20",

                // Light Mode (Minimalistik Vit)
                "bg-white/80 ring-1 ring-slate-900/5 shadow-slate-200/50",

                // Gradient options
                gradient && "dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-950/80 bg-gradient-to-br from-white/80 to-slate-50/80",

                className
            )}
            {...props}
        >
            {/* Optional top shine effect - subtle in light mode, more pronounced in dark */}
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
