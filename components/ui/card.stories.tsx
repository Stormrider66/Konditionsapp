/**
 * Card — shadcn composite primitive used throughout dashboards,
 * settings panels, and the public landing pages.
 *
 * Shows the full sub-component composition (CardHeader, CardTitle,
 * CardDescription, CardContent, CardFooter) so contributors can copy
 * the structure without re-reading the shadcn docs.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Card>

export const Basic: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Dagens pass</CardTitle>
        <CardDescription>Tröskelintervaller, 45 min</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Uppvärmning 10 min, 5 × 5 min vid LT2, vila 2 min, cooldown 5 min.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost">Skjut fram</Button>
        <Button>Starta</Button>
      </CardFooter>
    </Card>
  ),
}

export const StatGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-[640px]">
      <Card>
        <CardHeader>
          <CardDescription>ACWR</CardDescription>
          <CardTitle className="text-3xl">1.12</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Readiness</CardDescription>
          <CardTitle className="text-3xl">82</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Veckovolym</CardDescription>
          <CardTitle className="text-3xl">412 min</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
}
