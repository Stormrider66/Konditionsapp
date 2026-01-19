'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { BusinessMembersManager } from './BusinessMembersManager';

interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  primaryColor?: string | null;
  defaultRevenueShare: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    };
  }>;
  locations: Array<{
    id: string;
    name: string;
    city?: string | null;
    isActive: boolean;
    totalTests: number;
  }>;
  enterpriseContract?: {
    id: string;
    contractNumber: string;
    contractName: string;
    status: string;
    monthlyFee: number;
    currency: string;
    startDate: string;
    endDate?: string | null;
  } | null;
  _count: {
    members: number;
    locations: number;
    testers: number;
    athleteSubscriptions: number;
    apiKeys: number;
  };
}

interface BusinessDetailPanelProps {
  businessId: string;
  onUpdate?: () => void;
}

export function BusinessDetailPanel({ businessId, onUpdate }: BusinessDetailPanelProps) {
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchBusiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch business');
      }

      setBusiness(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  const handleMemberUpdate = () => {
    fetchBusiness();
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-600">{error || 'Business not found'}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchBusiness}>
          Try Again
        </Button>
      </div>
    );
  }

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-700';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({business._count.members})</TabsTrigger>
          <TabsTrigger value="locations">Locations ({business._count.locations})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Status & Branding */}
          <div className="flex items-center gap-2">
            <Badge variant={business.isActive ? 'default' : 'secondary'}>
              {business.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {business.primaryColor && (
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: business.primaryColor }}
                title={business.primaryColor}
              />
            )}
            <span className="text-xs text-muted-foreground font-mono">{business.slug}</span>
          </div>

          {/* Description */}
          {business.description && (
            <p className="text-sm text-muted-foreground">{business.description}</p>
          )}

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {business.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${business.email}`} className="hover:underline">
                    {business.email}
                  </a>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    {business.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {business.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{business.address}</p>
                    <p>
                      {[business.postalCode, business.city, business.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {!business.email && !business.phone && !business.website && !business.address && (
                <p className="text-muted-foreground">No contact information</p>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{business._count.members} members</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{business._count.locations} locations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{business._count.testers} testers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{business._count.athleteSubscriptions} subscriptions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          {business.enterpriseContract && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Enterprise Contract
                  <Badge className={getContractStatusColor(business.enterpriseContract.status)}>
                    {business.enterpriseContract.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract #</span>
                  <span className="font-mono">{business.enterpriseContract.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{business.enterpriseContract.contractName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee</span>
                  <span>
                    {new Intl.NumberFormat('sv-SE', {
                      style: 'currency',
                      currency: business.enterpriseContract.currency,
                      minimumFractionDigits: 0,
                    }).format(business.enterpriseContract.monthlyFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span>
                    {format(new Date(business.enterpriseContract.startDate), 'yyyy-MM-dd')}
                    {' - '}
                    {business.enterpriseContract.endDate
                      ? format(new Date(business.enterpriseContract.endDate), 'yyyy-MM-dd')
                      : 'Ongoing'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Created: {format(new Date(business.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Updated: {format(new Date(business.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4">
          <BusinessMembersManager
            businessId={business.id}
            members={business.members}
            onUpdate={handleMemberUpdate}
          />
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Locations</CardTitle>
              <CardDescription>Physical locations for this business</CardDescription>
            </CardHeader>
            <CardContent>
              {business.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations configured
                </p>
              ) : (
                <div className="space-y-2">
                  {business.locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{location.name}</p>
                        {location.city && (
                          <p className="text-sm text-muted-foreground">{location.city}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={location.isActive ? 'default' : 'secondary'}>
                          {location.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {location.totalTests} tests
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
