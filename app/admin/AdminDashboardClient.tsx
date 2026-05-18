'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  ClipboardList,
  RefreshCw,
  Search,
  Crown,
  Gift,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard,
  Monitor,
  Building2,
  Bot,
  BrainCircuit,
  Plus,
  X,
  Trash2,
  Pencil,
  Check,
  LifeBuoy,
  Coins,
} from 'lucide-react';
import { useLocale, useTranslations } from '@/i18n/client';
import { ContractsTable } from '@/components/admin/contracts/ContractsTable';
import { PricingTiersManager } from '@/components/admin/pricing/PricingTiersManager';
import { MonitoringDashboard } from '@/components/admin/monitoring/MonitoringDashboard';
import { BusinessesTable } from '@/components/admin/businesses/BusinessesTable';
import { AIModelsManager } from '@/components/admin/ai-models/AIModelsManager';
import { AISkillAuditPanel } from '@/components/admin/ai-skills/AISkillAuditPanel';
import { AthleteIntegrityHealthPanel } from '@/components/admin/data-health/AthleteIntegrityHealthPanel';
import { OperatorAgentsPanel } from '@/components/admin/operator-agents/OperatorAgentsPanel';
import { WeeklyReportsPanel } from '@/components/admin/operator-agents/WeeklyReportsPanel';
import { SupportTicketsPanel } from '@/components/admin/support/SupportTicketsPanel';
import { UnitEconomicsPanel } from '@/components/admin/economics/UnitEconomicsPanel';
import { AICostOverviewPanel } from '@/components/admin/economics/AICostOverviewPanel';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';

interface AdminDashboardClientProps {
  userId: string;
  userName: string;
}

interface AdminStats {
  period: { start: string; end: string; days: number };
  users: {
    total: number;
    newThisPeriod: number;
    byRole: Record<string, number>;
  };
  subscriptions: {
    byTier: Record<string, number>;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
    newThisPeriod: number;
  };
  content: {
    totalTests: number;
    testsThisPeriod: number;
    totalPrograms: number;
    programsThisPeriod: number;
  };
  activity: {
    totalWorkoutLogs: number;
    workoutLogsThisPeriod: number;
  };
  referrals: {
    totalCodes: number;
    totalReferrals: number;
    completedReferrals: number;
    conversionRate: number;
  };
  charts: {
    dailyRegistrations: Array<{ date: string; count: number }>;
  };
}

interface UserBusiness {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole: string | null;
  language: string;
  createdAt: string;
  subscription: {
    tier: string;
    status: string;
    maxAthletes: number | null;
    customAiAllowanceSek?: number | null;
    effectiveAiAllowanceSek?: number | null;
    businessEliteAiAllowanceSek?: number | null;
    aiAllowanceAccount?: {
      includedBudgetSek: number;
      includedUsedSek: number;
      topUpBalanceSek: number;
      periodEnd: string;
    } | null;
  } | null;
  clientsCount: number;
  businesses: UserBusiness[];
}

interface BusinessOption {
  id: string;
  name: string;
}

const COACH_TIER_OPTIONS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
const ATHLETE_TIER_OPTIONS = ['FREE', 'STANDARD', 'PRO', 'ELITE'] as const;

export function AdminDashboardClient({ userId, userName }: AdminDashboardClientProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [range, setRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  // Users pagination & filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([]);

  // Business assignment dialog
  const [assignDialogUser, setAssignDialogUser] = useState<User | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');

  // Email editing
  const [editingEmailUserId, setEditingEmailUserId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // Delete user dialog
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const assignUserToBusiness = async (userId: string, businessId: string) => {
    try {
      const response = await fetch('/api/admin/users/assign-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, businessId }),
      });
      if (response.ok) {
        setAssignDialogUser(null);
        setSelectedBusinessId('');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error assigning user to business:', error);
    }
  };

  const removeUserFromBusiness = async (userId: string, businessId: string) => {
    try {
      const response = await fetch('/api/admin/users/assign-business', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, businessId }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error removing user from business:', error);
    }
  };

  const deleteUser = async (targetUserId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setDeleteDialogUser(null);
        fetchUsers();
      } else {
        alert(result.error || t('deleteUserError'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('deleteUserUnexpected'));
    } finally {
      setDeleting(false);
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/stats?range=${range}`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter !== 'ALL' && { role: roleFilter }),
        ...(businessFilter !== 'ALL' && { business: businessFilter }),
      });
      const response = await fetch(`/api/admin/users?${params}`);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data.users);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, businessFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, businessFilter]);

  // Fetch businesses for filter dropdown when users tab is first opened
  useEffect(() => {
    if (activeTab === 'users' && businessOptions.length === 0) {
      fetch('/api/admin/businesses?limit=100')
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setBusinessOptions(
              result.data.businesses.map((b: { id: string; name: string }) => ({
                id: b.id,
                name: b.name,
              }))
            );
          }
        })
        .catch(console.error);
    }
  }, [activeTab, businessOptions.length]);

  // Fetch users when tab active and params change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleSearch = () => {
    // Immediately apply search (bypass debounce) for explicit user action
    setDebouncedSearch(search);
    setPage(1);
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const updateUserTier = async (userId: string, tier: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const updateAthleteAiAllowance = async (targetUserId: string, value: string) => {
    const trimmed = value.trim().replace(',', '.');
    const customAiAllowanceSek = trimmed === '' ? null : Number(trimmed);

    if (customAiAllowanceSek !== null && (!Number.isFinite(customAiAllowanceSek) || customAiAllowanceSek < 0)) {
      alert(t('positiveAmountOrDefault'));
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, customAiAllowanceSek }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        fetchUsers();
      } else {
        alert(result.error || t('aiCreditUpdateError'));
      }
    } catch (error) {
      console.error('Error updating athlete AI allowance:', error);
      alert(t('aiCreditUpdateUnexpected'));
    }
  };

  const updateAdminRole = async (userId: string, adminRole: string | null) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, adminRole }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating admin role:', error);
    }
  };

  const updateUserEmail = async (targetUserId: string, newEmail: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, email: newEmail }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setEditingEmailUserId(null);
        fetchUsers();
      } else {
        alert(result.error || t('emailUpdateError'));
      }
    } catch (error) {
      console.error('Error updating email:', error);
      alert(t('emailUpdateUnexpected'));
    }
  };

  const formatChartDate = (dateStr: string) => {
    const chartLocale = locale === 'en' ? enUS : sv;
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: chartLocale });
    } catch {
      return dateStr;
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE':
        return t('tierEnterprise');
      case 'PRO':
        return t('tierPro');
      case 'BASIC':
        return t('tierBasic');
      case 'STANDARD':
        return t('tierStandard');
      case 'ELITE':
        return t('tierElite');
      case 'FREE':
      default:
        return t('tierFree');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'COACH':
        return t('roleCoach');
      case 'ATHLETE':
        return t('roleAthlete');
      case 'ADMIN':
        return t('roleAdmin');
      default:
        return role;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return 'bg-amber-100 text-amber-700';
      case 'PRO': return 'bg-purple-100 text-purple-700';
      case 'BASIC': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-700';
      case 'COACH': return 'bg-blue-100 text-blue-700';
      case 'ATHLETE': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Horizontally scrollable tab bar on mobile, wraps naturally on desktop */}
        <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-x-visible">
          <TabsList className="inline-flex sm:flex sm:flex-wrap w-max sm:w-auto">
            <TabsTrigger value="overview" className="whitespace-nowrap">{t('overview')}</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap">{t('users')}</TabsTrigger>
            <TabsTrigger value="businesses" className="flex items-center gap-1 whitespace-nowrap">
              <Building2 className="h-3 w-3" />
              {t('businesses')}
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1 whitespace-nowrap">
              <CreditCard className="h-3 w-3" />
              {t('pricing')}
            </TabsTrigger>
            <TabsTrigger value="unit-economics" className="flex items-center gap-1 whitespace-nowrap">
              <TrendingUp className="h-3 w-3" />
              {t('unitEconomics')}
            </TabsTrigger>
            <TabsTrigger value="ai-costs" className="flex items-center gap-1 whitespace-nowrap">
              <Coins className="h-3 w-3" />
              {t('aiCosts')}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-1 whitespace-nowrap">
              <FileText className="h-3 w-3" />
              {t('contracts')}
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1 whitespace-nowrap">
              <Monitor className="h-3 w-3" />
              {t('monitoring')}
            </TabsTrigger>
            <TabsTrigger value="data-health" className="flex items-center gap-1 whitespace-nowrap">
              <Shield className="h-3 w-3" />
              {t('dataHealth')}
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-1 whitespace-nowrap">
              <Bot className="h-3 w-3" />
              {t('aiModels')}
            </TabsTrigger>
            <TabsTrigger value="ai-skills" className="flex items-center gap-1 whitespace-nowrap">
              <BrainCircuit className="h-3 w-3" />
              {t('aiSkills')}
            </TabsTrigger>
            <TabsTrigger value="operator-agents" className="flex items-center gap-1 whitespace-nowrap">
              <Bot className="h-3 w-3" />
              {t('agents')}
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1 whitespace-nowrap">
              <LifeBuoy className="h-3 w-3" />
              {t('support')}
            </TabsTrigger>
            <TabsTrigger value="weekly-reports" className="flex items-center gap-1 whitespace-nowrap">
              <FileText className="h-3 w-3" />
              {t('reports')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {stats && (
            <>
              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      {stats.users.newThisPeriod > 0 && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          +{stats.users.newThisPeriod}
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold">{stats.users.total}</p>
                    <p className="text-xs text-muted-foreground">{t('totalUsers')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {(stats.subscriptions.byTier.BASIC || 0) +
                        (stats.subscriptions.byTier.PRO || 0) +
                        (stats.subscriptions.byTier.ENTERPRISE || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('paidSubscriptions')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <ClipboardList className="h-5 w-5 text-green-500" />
                      {stats.content.testsThisPeriod > 0 && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          +{stats.content.testsThisPeriod}
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold">{stats.content.totalTests}</p>
                    <p className="text-xs text-muted-foreground">{t('totalTests')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.activity.workoutLogsThisPeriod}</p>
                    <p className="text-xs text-muted-foreground">{t('workoutsThisPeriod')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* User Registrations Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('userRegistrations')}</CardTitle>
                    <CardDescription>{t('dailyNewUsers')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.charts.dailyRegistrations}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            labelFormatter={(label) => formatChartDate(label as string)}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            name={t('newUsers')}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Subscription Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('subscriptionDistribution')}</CardTitle>
                    <CardDescription>{t('currentTiers')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map((tier) => {
                      const count = stats.subscriptions.byTier[tier] || 0;
                      const percentage = stats.users.total > 0
                        ? Math.round((count / stats.users.total) * 100)
                        : 0;
                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getTierColor(tier)}>{getTierLabel(tier)}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Referral & Activity Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {t('referralStats')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('totalCodes')}</span>
                      <span className="font-medium">{stats.referrals.totalCodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('totalReferrals')}</span>
                      <span className="font-medium">{stats.referrals.totalReferrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('completedReferrals')}</span>
                      <span className="font-medium">{stats.referrals.completedReferrals}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">{t('conversionRate')}</span>
                      <span className="font-bold text-green-600">{stats.referrals.conversionRate}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t('usersByRole')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {['COACH', 'ATHLETE', 'ADMIN'].map((role) => (
                      <div key={role} className="flex justify-between items-center">
                        <Badge className={getRoleColor(role)}>{getRoleLabel(role)}</Badge>
                        <span className="font-medium">{stats.users.byRole[role] || 0}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('contentStats')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('totalPrograms')}</span>
                      <span className="font-medium">{stats.content.totalPrograms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('programsThisPeriod')}</span>
                      <span className="font-medium text-green-600">+{stats.content.programsThisPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('totalClients')}</span>
                      <span className="font-medium">{stats.clients.total}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="unit-economics">
          <UnitEconomicsPanel range={range} />
        </TabsContent>

        <TabsContent value="ai-costs">
          <AICostOverviewPanel range={range} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('userManagement')}</CardTitle>
              <CardDescription>{t('userManagementDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder={t('searchUsers')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button variant="outline" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('allRoles')}</SelectItem>
                    <SelectItem value="COACH">{t('roleCoach')}</SelectItem>
                    <SelectItem value="ATHLETE">{t('roleAthlete')}</SelectItem>
                    <SelectItem value="ADMIN">{t('roleAdmin')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={businessFilter} onValueChange={setBusinessFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('allBusinesses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('allBusinesses')}</SelectItem>
                    <SelectItem value="NONE">{t('noBusiness')}</SelectItem>
                    {businessOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('name')}</TableHead>
                          <TableHead className="min-w-[220px]">{t('email')}</TableHead>
                          <TableHead className="w-[112px]">{t('role')}</TableHead>
                          <TableHead className="w-[136px]">{t('platform')}</TableHead>
                          <TableHead className="w-[128px]">{t('tier')}</TableHead>
                          <TableHead className="w-[150px]">{t('aiBudget')}</TableHead>
                          <TableHead className="w-[72px]">{t('clients')}</TableHead>
                          <TableHead>{t('businesses')}</TableHead>
                          <TableHead className="w-[104px] whitespace-nowrap">{t('joined')}</TableHead>
                          <TableHead className="sticky right-0 z-10 w-[56px] bg-background text-right">
                            <span className="sr-only">{t('actions')}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || '-'}</TableCell>
                            <TableCell>
                              {editingEmailUserId === user.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="email"
                                    value={editingEmailValue}
                                    onChange={(e) => setEditingEmailValue(e.target.value)}
                                    className="h-7 text-sm w-[200px]"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editingEmailValue && editingEmailValue !== user.email) {
                                        updateUserEmail(user.id, editingEmailValue);
                                      }
                                      if (e.key === 'Escape') setEditingEmailUserId(null);
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      if (editingEmailValue && editingEmailValue !== user.email) {
                                        updateUserEmail(user.id, editingEmailValue);
                                      } else {
                                        setEditingEmailUserId(null);
                                      }
                                    }}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setEditingEmailUserId(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 group">
                                  <span className="text-sm">{user.email}</span>
                                  <button
                                    onClick={() => {
                                      setEditingEmailUserId(user.id);
                                      setEditingEmailValue(user.email);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={t('editEmail')}
                                  >
                                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(v) => updateUserRole(user.id, v)}
                              >
                                <SelectTrigger className="w-[104px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COACH">{t('roleCoach')}</SelectItem>
                                  <SelectItem value="ATHLETE">{t('roleAthlete')}</SelectItem>
                                  <SelectItem value="ADMIN">{t('roleAdmin')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.adminRole || 'NONE'}
                                onValueChange={(v) => updateAdminRole(user.id, v === 'NONE' ? null : v)}
                              >
                                <SelectTrigger className="w-[118px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">{t('none')}</SelectItem>
                                  <SelectItem value="SUPER_ADMIN">{t('roleSuperAdmin')}</SelectItem>
                                  <SelectItem value="ADMIN">{t('roleAdmin')}</SelectItem>
                                  <SelectItem value="SUPPORT">{t('roleSupport')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.subscription?.tier || 'FREE'}
                                onValueChange={(v) => updateUserTier(user.id, v)}
                              >
                                <SelectTrigger className="w-[112px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(user.role === 'ATHLETE' ? ATHLETE_TIER_OPTIONS : COACH_TIER_OPTIONS).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {getTierLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {user.role === 'ATHLETE' ? (
                                <div className="min-w-[140px] space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      defaultValue={user.subscription?.customAiAllowanceSek ?? ''}
                                      placeholder={t('auto')}
                                      className="h-8 w-[76px] text-sm"
                                      inputMode="decimal"
                                      onBlur={(event) => {
                                        const nextValue = event.currentTarget.value;
                                        const currentValue = user.subscription?.customAiAllowanceSek?.toString() ?? '';
                                        if (nextValue.trim().replace(',', '.') !== currentValue) {
                                          updateAthleteAiAllowance(user.id, nextValue);
                                        }
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.currentTarget.blur();
                                        }
                                      }}
                                      title={t('emptyValueUsesDefaultAiAllowance')}
                                    />
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {user.subscription?.effectiveAiAllowanceSek ?? '-'} SEK
                                    </span>
                                  </div>
                                  <p className="text-[11px] leading-tight text-muted-foreground">
                                    {t('effectiveMonthlyLimit')}
                                    {user.subscription?.businessEliteAiAllowanceSek !== null &&
                                    user.subscription?.businessEliteAiAllowanceSek !== undefined
                                      ? `, ${t('eliteDefaultAiAllowance', { amount: user.subscription.businessEliteAiAllowanceSek })}`
                                      : ''}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>{user.clientsCount}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1">
                                {user.businesses.map((b) => (
                                  <Badge key={b.id} variant="outline" className="text-xs group">
                                    {b.name}
                                    <button
                                      onClick={() => removeUserFromBusiness(user.id, b.id)}
                                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title={t('removeCompanyTitle', { name: b.name })}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                <button
                                  onClick={() => setAssignDialogUser(user)}
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  title={t('assignBusiness')}
                                >
                                  <Plus className="h-3 w-3" />
                                  {user.businesses.length === 0 && t('assign')}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell className="sticky right-0 z-10 bg-background text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteDialogUser(user)}
                                title={t('deleteUser')}
                                disabled={user.id === userId}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {t('page')} {page} {t('of')} {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Businesses Tab */}
        <TabsContent value="businesses">
          <BusinessesTable />
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <PricingTiersManager />
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <ContractsTable />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <MonitoringDashboard />
        </TabsContent>

        <TabsContent value="data-health">
          <AthleteIntegrityHealthPanel />
        </TabsContent>

        {/* AI Models Tab */}
        <TabsContent value="ai-models">
          <AIModelsManager />
        </TabsContent>

        <TabsContent value="ai-skills">
          <AISkillAuditPanel />
        </TabsContent>

        {/* Operator Agents Tab */}
        <TabsContent value="operator-agents">
          <OperatorAgentsPanel />
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support">
          <SupportTicketsPanel />
        </TabsContent>

        {/* Weekly Reports Tab */}
        <TabsContent value="weekly-reports">
          <WeeklyReportsPanel />
        </TabsContent>
      </Tabs>

      {/* Assign Business Dialog */}
      <Dialog open={!!assignDialogUser} onOpenChange={(open) => { if (!open) { setAssignDialogUser(null); setSelectedBusinessId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assignBusiness')}</DialogTitle>
            <DialogDescription>
              {t('assignBusinessDescription', {
                user: assignDialogUser?.name || assignDialogUser?.email || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
              <SelectTrigger>
                <SelectValue placeholder={t('chooseBusiness')} />
              </SelectTrigger>
              <SelectContent>
                {businessOptions
                  .filter((b) => !assignDialogUser?.businesses.some((ub) => ub.id === b.id))
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAssignDialogUser(null); setSelectedBusinessId(''); }}>
                {tCommon('cancel')}
              </Button>
              <Button
                disabled={!selectedBusinessId}
                onClick={() => assignDialogUser && assignUserToBusiness(assignDialogUser.id, selectedBusinessId)}
              >
                {t('assign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteDialogUser} onOpenChange={(open) => { if (!open) setDeleteDialogUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteUserConfirmation', {
                user: deleteDialogUser?.name || deleteDialogUser?.email || '',
              })}
              {deleteDialogUser?.name && <> ({deleteDialogUser.email})</>}?
              {t('deleteUserWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteDialogUser) deleteUser(deleteDialogUser.id);
              }}
            >
              {deleting ? t('deleting') : tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
