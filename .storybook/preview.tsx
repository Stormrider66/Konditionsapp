/**
 * Storybook preview configuration.
 *
 * Imports the global Tailwind stylesheet so shadcn primitives render
 * with the same design tokens (CSS variables for --primary, --card,
 * --background, etc.) they use in the real app.
 */

import type { Preview } from '@storybook/react'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: 'hsl(var(--background))' },
        { name: 'white', value: '#ffffff' },
        { name: 'slate', value: '#0f172a' },
      ],
    },
  },
}

export default preview
