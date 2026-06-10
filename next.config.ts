import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Launch-config gate. Several scale-critical protections degrade SILENTLY
// when their env vars are missing (rate limiting and the Strava quota
// cooldown fall back to per-instance memory; middleware crashes at runtime
// without the service role key; cron routes 500 without CRON_SECRET), so a
// production build without them is blocked here instead of discovered in
// prod. Escape hatch for emergencies: SKIP_LAUNCH_ENV_CHECK=true.
function assertProductionEnv(): void {
  if (process.env.VERCEL_ENV !== 'production') return;
  if (process.env.SKIP_LAUNCH_ENV_CHECK === 'true') {
    console.warn('[launch-env-check] BYPASSED via SKIP_LAUNCH_ENV_CHECK — re-enable after the emergency.');
    return;
  }

  const missing: string[] = [];
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    missing.push('UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (rate limiting and Strava quota cooldown degrade to per-instance memory without them)');
  }
  if (!process.env.CRON_SECRET) {
    missing.push('CRON_SECRET (every cron route fails closed with 500)');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY (middleware throws at runtime)');
  }
  if (missing.length > 0) {
    throw new Error(
      `Production build blocked — missing launch-critical env vars:\n - ${missing.join('\n - ')}\n` +
      'Set SKIP_LAUNCH_ENV_CHECK=true only for an emergency deploy.'
    );
  }

  // Warnings only: USE_JWT_CLAIMS=false is the documented emergency rollback
  // for the Supabase auth hook (CLAUDE.md), and missing Sentry disables
  // error tracking but should not block a hotfix.
  if (process.env.USE_JWT_CLAIMS !== 'true') {
    console.warn('[launch-env-check] USE_JWT_CLAIMS is not "true" — middleware will use the slow per-request DB lookup fallback.');
  }
  if (!process.env.SENTRY_AUTH_TOKEN || !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT) {
    console.warn('[launch-env-check] Sentry env incomplete — error tracking is DISABLED for this deploy.');
  }
}

assertProductionEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'archiver',
    'bluebird',
    'exceljs',
    'jszip',
    'unzipper',
  ],
  experimental: {
    serverActions: {
      // Tight by default. No Server Action in this codebase accepts a
      // File/FormData today; file uploads go through dedicated API
      // routes that validate size themselves. Bump this if a Server
      // Action ever needs a larger body.
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config) => {
    config.ignoreWarnings = config.ignoreWarnings || []
    config.ignoreWarnings.push({
      module: /@opentelemetry\/instrumentation/,
      message: /Critical dependency: the request of a dependency is an expression/,
    })
    return config
  },
};

const sentryEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

const baseConfig = withNextIntl(nextConfig);

export default sentryEnabled
  ? withSentryConfig(baseConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      tunnelRoute: '/monitoring-tunnel',

      // Hide source maps from generated client bundles
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
    })
  : baseConfig;
