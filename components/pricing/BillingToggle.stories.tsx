/**
 * BillingToggle — the tiny client island on the /pricing page.
 *
 * In production the toggle drives a URL search param via
 * router.replace(), so these stories stub out next/navigation to
 * keep the component self-contained. The stories are primarily for
 * visual reference: what the toggle looks like in both states and
 * with localised labels (Swedish vs English).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { BillingToggle } from './BillingToggle'

const meta: Meta<typeof BillingToggle> = {
  title: 'Domain/Pricing/BillingToggle',
  component: BillingToggle,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      // Tell @storybook/nextjs to stub useRouter / useSearchParams so
      // the component renders without wiring up a real route tree.
      appDirectory: true,
      navigation: { pathname: '/pricing' },
    },
    layout: 'centered',
  },
  args: {
    isYearly: true,
    monthlyLabel: 'Monthly',
    yearlyLabel: 'Yearly',
    discountLabel: '-17%',
  },
}

export default meta

type Story = StoryObj<typeof BillingToggle>

export const Yearly: Story = {}

export const Monthly: Story = {
  args: { isYearly: false },
}

export const Swedish: Story = {
  args: {
    monthlyLabel: 'Månadsvis',
    yearlyLabel: 'Årsvis',
  },
}
