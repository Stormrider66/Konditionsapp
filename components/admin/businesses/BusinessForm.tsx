'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Save } from 'lucide-react';
import { Business } from '@/types';

interface BusinessFormProps {
  business?: Business | null;
  onSuccess: () => void;
}

export function BusinessForm({ business, onSuccess }: BusinessFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: business?.name || '',
    slug: business?.slug || '',
    description: '',
    email: business?.email || '',
    phone: business?.phone || '',
    website: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'SE',
    primaryColor: '#3b82f6',
    defaultRevenueShare: 20,
    isActive: business?.isActive ?? true,
  });

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = business
        ? `/api/admin/businesses/${business.id}`
        : '/api/admin/businesses';
      const method = business ? 'PUT' : 'POST';

      // Clean up empty strings to null
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ])
      );

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save business');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Star by Thomson"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug
              <span className="text-xs text-muted-foreground ml-1">(auto-generated if empty)</span>
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="star-by-thomson"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Brief description of the business..."
            rows={3}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@business.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+46 70 123 4567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://www.business.com"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Address</h3>

        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Kungsgatan 1"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder="111 43"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Stockholm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="SE"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultRevenueShare">Default Revenue Share (%)</Label>
            <Input
              id="defaultRevenueShare"
              type="number"
              min={0}
              max={100}
              value={formData.defaultRevenueShare}
              onChange={(e) => handleChange('defaultRevenueShare', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Active</Label>
            <p className="text-sm text-muted-foreground">
              Inactive businesses are hidden from normal views
            </p>
          </div>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleChange('isActive', checked)}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {business ? 'Update Business' : 'Create Business'}
        </Button>
      </div>
    </form>
  );
}
