/**
 * Sentry Utility Functions
 *
 * Provides convenient wrappers for manual error capture and context setting.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception to Sentry with additional context
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, {
 *     tags: { module: 'payments' },
 *     extra: { userId, amount }
 *   });
 * }
 * ```
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email?: string; name?: string };
    level?: Sentry.SeverityLevel;
  }
): string {
  const eventId = Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    level: context?.level,
  });

  return eventId;
}

/**
 * Capture a message to Sentry (for non-error events)
 *
 * @example
 * ```typescript
 * captureMessage('User exceeded rate limit', {
 *   level: 'warning',
 *   tags: { feature: 'api' },
 *   extra: { userId, requestCount }
 * });
 * ```
 */
export function captureMessage(
  message: string,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string {
  return Sentry.captureMessage(message, {
    level: context?.level || 'info',
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Set the current user context for all subsequent events
 *
 * @example
 * ```typescript
 * setUser({ id: user.id, email: user.email, role: user.role });
 * ```
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
} | null): void {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging
 *
 * @example
 * ```typescript
 * addBreadcrumb({
 *   category: 'user-action',
 *   message: 'User clicked submit',
 *   level: 'info',
 *   data: { formId: 'checkout' }
 * });
 * ```
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Create a span for performance monitoring
 *
 * @example
 * ```typescript
 * await withSpan('database-query', async () => {
 *   return await prisma.user.findMany();
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  callback: () => Promise<T>,
  options?: {
    op?: string;
    description?: string;
    data?: Record<string, string | number | boolean | undefined>;
  }
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: options?.op || 'function',
      attributes: options?.data,
    },
    async () => {
      return callback();
    }
  );
}

/**
 * Set a tag that will be attached to all subsequent events
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set extra context that will be attached to all subsequent events
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}

/**
 * Get the last event ID (useful for error pages)
 */
export function getLastEventId(): string | undefined {
  return Sentry.lastEventId();
}

/**
 * Flush all pending events to Sentry
 * Useful before serverless function terminates
 */
export async function flush(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Wrap an async function with error capture
 *
 * @example
 * ```typescript
 * const safeOperation = wrapWithSentry(async () => {
 *   return await riskyOperation();
 * }, 'risky-operation');
 *
 * const result = await safeOperation();
 * ```
 */
export function wrapWithSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string,
  options?: {
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, {
        tags: { ...options?.tags, function: name },
        extra: { args },
      });
      throw error;
    }
  }) as T;
}

// Re-export Sentry for advanced usage
export { Sentry };
