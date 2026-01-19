'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We apologize for the inconvenience. An unexpected error has occurred.
              Our team has been notified and is working on a fix.
            </p>

            {error.digest && (
              <p className="text-xs text-gray-400 mb-6 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => reset()}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>

              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
