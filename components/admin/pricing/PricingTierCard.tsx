'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit, Check, X, Users, MessageCircle, Infinity } from 'lucide-react';
import { PricingTier } from '@/types';

interface PricingTierCardProps {
  tier: PricingTier;
  formatPrice: (cents: number, currency: string) => string;
  onUpdate: (tierId: string, updates: Partial<PricingTier>) => Promise<void>;
}

export function PricingTierCard({ tier, formatPrice, onUpdate }: PricingTierCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    monthlyPriceCents: tier.monthlyPriceCents,
    yearlyPriceCents: tier.yearlyPriceCents || 0,
    maxAthletes: tier.maxAthletes,
    aiChatLimit: tier.aiChatLimit,
    isActive: tier.isActive,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(tier.id, editData);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const tierColors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    BASIC: 'bg-blue-100 text-blue-700',
    STANDARD: 'bg-blue-100 text-blue-700',
    PRO: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
  };

  return (
    <Card className={!tier.isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tier.displayName}</CardTitle>
          <Badge className={tierColors[tier.tierName] || 'bg-gray-100 text-gray-700'}>
            {tier.tierName}
          </Badge>
        </div>
        {!tier.isActive && (
          <Badge variant="outline" className="text-red-500 border-red-500 w-fit">
            Inactive
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold">
            {formatPrice(tier.monthlyPriceCents, tier.currency)}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          {tier.yearlyPriceCents && tier.yearlyPriceCents > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatPrice(tier.yearlyPriceCents, tier.currency)}/year
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {tier.maxAthletes === -1 ? (
                <span className="flex items-center gap-1">
                  <Infinity className="h-3 w-3" /> Unlimited athletes
                </span>
              ) : (
                `${tier.maxAthletes} athletes`
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span>
              {tier.aiChatLimit === -1 ? (
                <span className="flex items-center gap-1">
                  <Infinity className="h-3 w-3" /> Unlimited AI messages
                </span>
              ) : tier.aiChatLimit === 0 ? (
                'No AI access'
              ) : (
                `${tier.aiChatLimit} AI messages/mo`
              )}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Features:</p>
          <ul className="text-xs space-y-1">
            {(tier.features as string[]).slice(0, 4).map((feature, i) => (
              <li key={i} className="flex items-start gap-1">
                <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
            {(tier.features as string[]).length > 4 && (
              <li className="text-muted-foreground">
                +{(tier.features as string[]).length - 4} more
              </li>
            )}
          </ul>
        </div>

        {tier.stripeProductId && (
          <p className="text-xs text-muted-foreground">
            Stripe: {tier.stripeProductId.substring(0, 20)}...
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {tier.displayName}</DialogTitle>
              <DialogDescription>
                Update pricing and limits for this tier
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyPrice">Monthly Price (öre)</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    value={editData.monthlyPriceCents}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        monthlyPriceCents: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatPrice(editData.monthlyPriceCents, tier.currency)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="yearlyPrice">Yearly Price (öre)</Label>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    value={editData.yearlyPriceCents}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        yearlyPriceCents: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatPrice(editData.yearlyPriceCents, tier.currency)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxAthletes">Max Athletes</Label>
                  <Input
                    id="maxAthletes"
                    type="number"
                    value={editData.maxAthletes}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        maxAthletes: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
                </div>
                <div>
                  <Label htmlFor="aiChatLimit">AI Chat Limit</Label>
                  <Input
                    id="aiChatLimit"
                    type="number"
                    value={editData.aiChatLimit}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        aiChatLimit: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    -1 = unlimited, 0 = no access
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={editData.isActive}
                  onCheckedChange={(checked) =>
                    setEditData((d) => ({ ...d, isActive: checked }))
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
