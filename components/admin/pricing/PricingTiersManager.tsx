'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { PricingTier } from '@/types';
import { PricingTierCard } from './PricingTierCard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function PricingTiersManager() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    errors: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState('COACH');

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing?includeInactive=true');
      const result = await response.json();
      if (result.success) {
        setTiers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing tiers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const handleSyncStripe = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/admin/pricing/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        setSyncResult({
          synced: result.data.synced,
          errors: result.data.errors,
        });
        fetchTiers();
      }
    } catch (error) {
      console.error('Failed to sync with Stripe:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateTier = async (tierId: string, updates: Partial<PricingTier>) => {
    try {
      const response = await fetch(`/api/admin/pricing/${tierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchTiers();
      }
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  };

  const coachTiers = tiers.filter((t) => t.tierType === 'COACH');
  const athleteTiers = tiers.filter((t) => t.tierType === 'ATHLETE');

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <CreditCard className="h-5 w-5" />
                Pricing Management <InfoTooltip conceptKey="subscriptionTiers" />
              </CardTitle>
              <CardDescription>
                Manage subscription tiers and pricing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchTiers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleSyncStripe} disabled={syncing}>
                {syncing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Sync to Stripe
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {syncResult && (
            <Alert className={syncResult.errors > 0 ? 'border-yellow-500' : 'border-green-500'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stripe sync complete: {syncResult.synced} synced
                {syncResult.errors > 0 && `, ${syncResult.errors} errors`}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="COACH">Coach Tiers</TabsTrigger>
              <TabsTrigger value="ATHLETE">Athlete Tiers</TabsTrigger>
            </TabsList>

            <TabsContent value="COACH" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {coachTiers.map((tier) => (
                    <PricingTierCard
                      key={tier.id}
                      tier={tier}
                      formatPrice={formatPrice}
                      onUpdate={handleUpdateTier}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ATHLETE" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {athleteTiers.map((tier) => (
                    <PricingTierCard
                      key={tier.id}
                      tier={tier}
                      formatPrice={formatPrice}
                      onUpdate={handleUpdateTier}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
