'use client'

/**
 * Request Human Coach Card
 *
 * Allows AI-coached athletes to request connection with a human coach.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Users, ChevronRight, MessageSquare, Award, Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RequestHumanCoachCardProps {
  basePath?: string
}

export function RequestHumanCoachCard({ basePath = '' }: RequestHumanCoachCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequestCoach = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/athlete/request-coach', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to submit request')

      toast.success("We've received your request! We'll be in touch soon.")
      setIsOpen(false)
    } catch (error) {
      toast.error('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Want a Human Coach?
        </GlassCardTitle>
        <GlassCardDescription>
          Get personalized guidance from an experienced coach
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          While your AI coach handles day-to-day training, a human coach can provide deeper
          insights, motivation, and personalized attention.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <span>Direct messaging with your coach</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-indigo-500" />
            <span>Personalized program adjustments</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4 text-indigo-500" />
            <span>Injury and recovery support</span>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              Learn More
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect with a Human Coach</DialogTitle>
              <DialogDescription>
                Get matched with an experienced coach who can work alongside your AI training
                system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-medium">What you&apos;ll get:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Weekly check-ins with your coach</li>
                  <li>• Program customization based on your feedback</li>
                  <li>• Expert guidance on technique and form</li>
                  <li>• Race strategy and pacing advice</li>
                  <li>• Injury prevention and recovery support</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your AI coach continues working for you! The human coach adds an extra layer
                  of personalization and expertise.
                </p>
              </div>

              <Button
                onClick={handleRequestCoach}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Request a Coach Match
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                We&apos;ll contact you within 24-48 hours with coach options
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </GlassCardContent>
    </GlassCard>
  )
}
