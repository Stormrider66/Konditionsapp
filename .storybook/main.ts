/**
 * Storybook main configuration.
 *
 * Minimal setup for the Elite Training Platform component library.
 * Stories live next to the components they document (components/**)
 * and use the .stories.tsx suffix.
 *
 * The @storybook/nextjs framework reads the project's tsconfig.json
 * directly, so the '@/*' alias used throughout the codebase works
 * out of the box — no manual webpack config needed.
 *
 * Run `npm run storybook` for the dev server, or `npm run
 * build-storybook` to produce a static site in ./storybook-static.
 */

import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx|mdx)'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  typescript: {
    // Next.js + shadcn projects are large; using react-docgen (the
    // fast non-typescript walker) keeps cold starts reasonable.
    reactDocgen: 'react-docgen',
  },
  staticDirs: ['../public'],
}

export default config
