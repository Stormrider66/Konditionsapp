/**
 * Badge — used to surface ACWR zones, readiness status, subscription
 * tiers, and alert severities throughout the coach dashboards.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
  args: {
    children: 'PRO',
    variant: 'default',
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Default: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

/**
 * Example from the ACWR monitor — each zone has its own colour so
 * coaches can scan a list of athletes quickly. These combinations
 * are the canonical ones used in the dashboard cards.
 */
export const ACWRZones: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">Detraining</Badge>
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
        Optimal
      </Badge>
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-transparent">
        Caution
      </Badge>
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-transparent">
        Danger
      </Badge>
      <Badge variant="destructive">Critical</Badge>
    </div>
  ),
}
