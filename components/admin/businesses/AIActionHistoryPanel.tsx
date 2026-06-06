'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Bot, RefreshCw, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ActionStatus = 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
type StatusFilter = ActionStatus | 'ALL';

interface ActionPreview {
  title?: string;
  description?: string;
  targetLabel?: string;
  details?: string[];
  subject?: string | null;
  body?: string | null;
}

interface AIActionHistoryItem {
  id: string;
  capabilityId: string;
  actorUserId: string;
  actorRole: string;
  surface: string;
  actionType: string;
  riskLevel: string;
  status: ActionStatus;
  clientId?: string | null;
  teamId?: string | null;
  preview: ActionPreview | null;
  errorMessage?: string | null;
  expiresAt: string;
  confirmedAt?: string | null;
  executedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  actorName: string;
  actorEmail?: string | null;
  clientName?: string | null;
  teamName?: string | null;
}

interface AIActionHistoryResponse {
  success: boolean;
  data: {
    summary: Record<ActionStatus, number>;
    actions: AIActionHistoryItem[];
  };
  error?: string;
}

interface AIActionHistoryPanelProps {
  businessId: string;
  initialEnabled: boolean;
  onEnabledChange?: (enabled: boolean) => void;
}

const fetcher = async (url: string): Promise<AIActionHistoryResponse> => {
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to load AI actions');
  }

  return result;
};

const actionStatuses: ActionStatus[] = [
  'PENDING',
  'CONFIRMED',
  'EXECUTED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
];

function statusLabel(status: StatusFilter): string {
  if (status === 'ALL') return 'All statuses';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusBadgeClass(status: ActionStatus): string {
  switch (status) {
    case 'PENDING':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800';
    case 'CONFIRMED':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'EXECUTED':
      return 'border-green-200 bg-green-50 text-green-800';
    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'CANCELLED':
      return 'border-gray-200 bg-gray-50 text-gray-700';
    case 'EXPIRED':
      return 'border-orange-200 bg-orange-50 text-orange-800';
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return format(new Date(value), 'yyyy-MM-dd HH:mm');
}

function actionTitle(action: AIActionHistoryItem): string {
  return action.preview?.title || action.capabilityId;
}

function actionTarget(action: AIActionHistoryItem): string {
  return action.preview?.targetLabel || action.clientName || action.teamName || 'Business scope';
}

function actionOutcome(action: AIActionHistoryItem): string {
  if (action.status === 'FAILED') return action.errorMessage || 'Failed';
  if (action.status === 'EXECUTED') return `Executed ${formatDate(action.executedAt)}`;
  if (action.status === 'CANCELLED') return `Cancelled ${formatDate(action.cancelledAt)}`;
  if (action.status === 'EXPIRED') return `Expired ${formatDate(action.expiresAt)}`;
  if (action.status === 'CONFIRMED') return `Confirmed ${formatDate(action.confirmedAt)}`;
  return `Expires ${formatDate(action.expiresAt)}`;
}

export function AIActionHistoryPanel({
  businessId,
  initialEnabled,
  onEnabledChange,
}: AIActionHistoryPanelProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [toggling, setToggling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [toggleError, setToggleError] = useState<string | null>(null);
  const params = new URLSearchParams({
    limit: '50',
    status: statusFilter,
  });
  const {
    data,
    error: historyError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AIActionHistoryResponse>(
    `/api/admin/businesses/${businessId}/ai-actions?${params.toString()}`,
    fetcher
  );

  const actions = data?.data.actions ?? [];
  const summary = data?.data.summary ?? (
    Object.fromEntries(actionStatuses.map((status) => [status, 0])) as Record<ActionStatus, number>
  );
  const error = toggleError || (historyError instanceof Error ? historyError.message : null);
  const loadingActions = isLoading || isValidating;

  const totalActions = useMemo(
    () => Object.values(summary).reduce((total, value) => total + value, 0),
    [summary]
  );

  const handleToggle = async (nextEnabled: boolean) => {
    const previous = enabled;
    setEnabled(nextEnabled);
    setToggling(true);
    setToggleError(null);

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/ai-operations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update AI operations');
      }

      setEnabled(result.data.enabled);
      onEnabledChange?.(result.data.enabled);
    } catch (err) {
      setEnabled(previous);
      setToggleError(err instanceof Error ? err.message : 'Failed to update AI operations');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" />
                AI Operations Beta
              </CardTitle>
              <CardDescription>
                Enables registered AI actions with confirmation cards for this business.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={enabled ? 'default' : 'secondary'}>
                {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={enabled}
                disabled={toggling}
                aria-label="Toggle AI operations beta"
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-semibold">{totalActions}</p>
        </div>
        {actionStatuses.map((status) => (
          <div key={status} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{statusLabel(status)}</p>
            <p className="mt-1 text-xl font-semibold">{summary[status]}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4" />
                Action History
              </CardTitle>
              <CardDescription>Recent drafts, confirmations, executions, and failures.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {actionStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void mutate()}
                disabled={loadingActions}
              >
                <RefreshCw className={`h-4 w-4 ${loadingActions ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingActions ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading actions
            </div>
          ) : actions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No AI actions found for this filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(action.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px]">
                        <p className="truncate font-medium">{actionTitle(action)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {action.capabilityId} - {action.actionType} - {action.riskLevel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(action.status)}>
                        {statusLabel(action.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium">{action.actorName}</p>
                        <p className="truncate text-xs text-muted-foreground">{action.actorRole}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[180px] truncate">{actionTarget(action)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {actionOutcome(action)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
