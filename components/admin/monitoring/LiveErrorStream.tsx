'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Check, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SystemError } from '@/types';

interface LiveErrorStreamProps {
  errors: Array<{
    id: string;
    level: string;
    message: string;
    route: string | null;
    createdAt: string;
    sentryEventId: string | null;
  }>;
}

const levelColors: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  ERROR: 'bg-red-100 text-red-700',
  WARN: 'bg-yellow-100 text-yellow-700',
};

export function LiveErrorStream({ errors: liveErrors }: LiveErrorStreamProps) {
  const [allErrors, setAllErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);

  const fetchErrors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/monitoring/errors?resolved=false&limit=20');
      const result = await response.json();
      if (result.success) {
        setAllErrors(result.data.errors);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleResolve = async (errorId: string) => {
    try {
      const response = await fetch(`/api/admin/monitoring/errors/${errorId}/resolve`, {
        method: 'POST',
      });
      if (response.ok) {
        setAllErrors((prev) => prev.filter((e) => e.id !== errorId));
        setSelectedError(null);
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const displayErrors = allErrors.length > 0 ? allErrors : liveErrors.map((e) => ({
    ...e,
    stack: null,
    userId: null,
    method: null,
    statusCode: null,
    userAgent: null,
    metadata: null,
    isResolved: false,
    resolvedAt: null,
    resolvedById: null,
    resolvedBy: null,
  } as SystemError));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Live Error Feed
            </CardTitle>
            <CardDescription>Recent unresolved errors</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchErrors}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {displayErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Check className="h-8 w-8 mb-2 text-green-500" />
              <p>No unresolved errors</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayErrors.map((error) => (
                <Dialog
                  key={error.id}
                  open={selectedError?.id === error.id}
                  onOpenChange={(open) => !open && setSelectedError(null)}
                >
                  <DialogTrigger asChild>
                    <div
                      className="p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={levelColors[error.level] || levelColors.ERROR}>
                              {error.level}
                            </Badge>
                            {error.route && (
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                {error.route}
                              </span>
                            )}
                          </div>
                          <p className="text-sm truncate">{error.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(error.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Badge className={levelColors[error.level] || levelColors.ERROR}>
                          {error.level}
                        </Badge>
                        Error Details
                      </DialogTitle>
                      <DialogDescription>
                        {error.route && <span className="font-mono">{error.route}</span>}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Message</h4>
                        <p className="text-sm bg-muted p-2 rounded">{error.message}</p>
                      </div>

                      {error.stack && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Stack Trace</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Status Code:</span>{' '}
                          {error.statusCode || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Method:</span>{' '}
                          {error.method || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">User ID:</span>{' '}
                          {error.userId || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>{' '}
                          {new Date(error.createdAt).toLocaleString('sv-SE')}
                        </div>
                      </div>

                      {error.sentryEventId && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Sentry Event:</span>
                          <code className="text-xs bg-muted px-1 rounded">
                            {error.sentryEventId}
                          </code>
                          <a
                            href={`https://sentry.io/organizations/${process.env.NEXT_PUBLIC_SENTRY_ORG}/issues/?query=${error.sentryEventId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1"
                          >
                            View in Sentry
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedError(null)}
                        >
                          Close
                        </Button>
                        <Button onClick={() => handleResolve(error.id)}>
                          <Check className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
