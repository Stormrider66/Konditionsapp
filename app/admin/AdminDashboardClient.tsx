'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useTranslations } from '@/i18n/client';
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
import { sv } from 'date-fns/locale';

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

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  language: string;
  createdAt: string;
  subscription: {
    tier: string;
    status: string;
    maxAthletes: number;
  } | null;
  clientsCount: number;
}

export function AdminDashboardClient({ userId, userName }: AdminDashboardClientProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

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
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchStats();
  }, [range]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search or role filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  // Fetch users when tab active and params change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, page, roleFilter, debouncedSearch]);

  const fetchStats = async () => {
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
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter && { role: roleFilter }),
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
  };

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

  const formatChartDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: sv });
    } catch {
      return dateStr;
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
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('users')}</TabsTrigger>
        </TabsList>

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
                            <Badge className={getTierColor(tier)}>{tier}</Badge>
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
                        <Badge className={getRoleColor(role)}>{role}</Badge>
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
                    <SelectItem value="">{t('allRoles')}</SelectItem>
                    <SelectItem value="COACH">Coach</SelectItem>
                    <SelectItem value="ATHLETE">Athlete</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
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
                          <TableHead>{t('email')}</TableHead>
                          <TableHead>{t('role')}</TableHead>
                          <TableHead>{t('tier')}</TableHead>
                          <TableHead>{t('clients')}</TableHead>
                          <TableHead>{t('joined')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || '-'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(v) => updateUserRole(user.id, v)}
                              >
                                <SelectTrigger className="w-[100px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COACH">Coach</SelectItem>
                                  <SelectItem value="ATHLETE">Athlete</SelectItem>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.subscription?.tier || 'FREE'}
                                onValueChange={(v) => updateUserTier(user.id, v)}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="FREE">Free</SelectItem>
                                  <SelectItem value="BASIC">Basic</SelectItem>
                                  <SelectItem value="PRO">Pro</SelectItem>
                                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{user.clientsCount}</TableCell>
                            <TableCell>
                              {format(new Date(user.createdAt), 'yyyy-MM-dd')}
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
      </Tabs>
    </div>
  );
}
