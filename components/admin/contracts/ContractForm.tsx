'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { EnterpriseContract } from '@/types';

const contractSchema = z.object({
  businessId: z.string().min(1, 'Business is required'),
  contractName: z.string().min(1, 'Contract name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  monthlyFee: z.number().min(0, 'Must be at least 0'),
  currency: z.string(),
  revenueSharePercent: z.number().min(0).max(100),
  athleteLimit: z.number(),
  coachLimit: z.number(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  paymentTermDays: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
  autoRenew: z.boolean(),
  noticePeriodDays: z.number(),
  notes: z.string().optional(),
});

type ContractFormData = z.input<typeof contractSchema>;

interface Business {
  id: string;
  name: string;
  slug: string;
}

interface ContractFormProps {
  contract?: EnterpriseContract;
  onSuccess: () => void;
}

export function ContractForm({ contract, onSuccess }: ContractFormProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!contract;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: contract
      ? {
          businessId: contract.businessId,
          contractName: contract.contractName,
          contactName: contract.contactName,
          contactEmail: contract.contactEmail,
          contactPhone: contract.contactPhone || '',
          monthlyFee: contract.monthlyFee,
          currency: contract.currency,
          revenueSharePercent: contract.revenueSharePercent,
          athleteLimit: contract.athleteLimit,
          coachLimit: contract.coachLimit,
          billingCycle: contract.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
          paymentTermDays: contract.paymentTermDays,
          startDate: contract.startDate.split('T')[0],
          endDate: contract.endDate?.split('T')[0] || '',
          autoRenew: contract.autoRenew,
          noticePeriodDays: contract.noticePeriodDays,
        }
      : {
          currency: 'SEK',
          revenueSharePercent: 75,
          athleteLimit: -1,
          coachLimit: -1,
          billingCycle: 'MONTHLY',
          paymentTermDays: 30,
          autoRenew: true,
          noticePeriodDays: 90,
          startDate: new Date().toISOString().split('T')[0],
        },
  });

  const autoRenew = watch('autoRenew');

  useEffect(() => {
    // Fetch businesses for dropdown
    async function fetchBusinesses() {
      try {
        const response = await fetch('/api/admin/businesses');
        const result = await response.json();
        if (result.success) {
          setBusinesses(result.data?.businesses || []);
        }
      } catch (err) {
        console.error('Failed to fetch businesses:', err);
      }
    }
    fetchBusinesses();
  }, []);

  const onSubmit = async (data: ContractFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/contracts/${contract.id}`
        : '/api/admin/contracts';

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          endDate: data.endDate || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save contract');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Business Selection */}
        <div className="col-span-2">
          <Label htmlFor="businessId">Business</Label>
          <Select
            value={watch('businessId')}
            onValueChange={(value) => setValue('businessId', value)}
            disabled={isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.businessId && (
            <p className="text-sm text-red-500 mt-1">{errors.businessId.message}</p>
          )}
        </div>

        {/* Contract Name */}
        <div className="col-span-2">
          <Label htmlFor="contractName">Contract Name</Label>
          <Input
            id="contractName"
            {...register('contractName')}
            placeholder="e.g., Annual Enterprise Agreement"
          />
          {errors.contractName && (
            <p className="text-sm text-red-500 mt-1">{errors.contractName.message}</p>
          )}
        </div>

        {/* Contact Info */}
        <div>
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            {...register('contactName')}
            placeholder="John Doe"
          />
          {errors.contactName && (
            <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            {...register('contactEmail')}
            placeholder="john@company.com"
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-500 mt-1">{errors.contactEmail.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            {...register('contactPhone')}
            placeholder="+46 70 123 4567"
          />
        </div>

        {/* Pricing */}
        <div>
          <Label htmlFor="monthlyFee">Monthly Fee</Label>
          <Input
            id="monthlyFee"
            type="number"
            {...register('monthlyFee', { valueAsNumber: true })}
          />
          {errors.monthlyFee && (
            <p className="text-sm text-red-500 mt-1">{errors.monthlyFee.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={watch('currency')}
            onValueChange={(value) => setValue('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEK">SEK</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="revenueSharePercent">Revenue Share %</Label>
          <Input
            id="revenueSharePercent"
            type="number"
            min={0}
            max={100}
            {...register('revenueSharePercent', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Percentage the business receives
          </p>
        </div>

        <div>
          <Label htmlFor="billingCycle">Billing Cycle</Label>
          <Select
            value={watch('billingCycle')}
            onValueChange={(value: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') =>
              setValue('billingCycle', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Limits */}
        <div>
          <Label htmlFor="athleteLimit">Athlete Limit</Label>
          <Input
            id="athleteLimit"
            type="number"
            {...register('athleteLimit', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
        </div>

        <div>
          <Label htmlFor="coachLimit">Coach Limit</Label>
          <Input
            id="coachLimit"
            type="number"
            {...register('coachLimit', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground mt-1">-1 = unlimited</p>
        </div>

        {/* Dates */}
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
          {errors.startDate && (
            <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
          <p className="text-xs text-muted-foreground mt-1">Leave empty for no end date</p>
        </div>

        {/* Terms */}
        <div>
          <Label htmlFor="paymentTermDays">Payment Terms (days)</Label>
          <Input
            id="paymentTermDays"
            type="number"
            {...register('paymentTermDays', { valueAsNumber: true })}
          />
        </div>

        <div>
          <Label htmlFor="noticePeriodDays">Notice Period (days)</Label>
          <Input
            id="noticePeriodDays"
            type="number"
            {...register('noticePeriodDays', { valueAsNumber: true })}
          />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <Switch
            id="autoRenew"
            checked={autoRenew}
            onCheckedChange={(checked) => setValue('autoRenew', checked)}
          />
          <Label htmlFor="autoRenew">Auto-renew contract</Label>
        </div>

        {/* Notes (for edits) */}
        {isEditing && (
          <div className="col-span-2">
            <Label htmlFor="notes">Change Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Describe the reason for this change..."
              rows={3}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Contract' : 'Create Contract'}
        </Button>
      </div>
    </form>
  );
}
