'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BusinessOverviewTab } from '@/components/coach/admin/BusinessOverviewTab'
import { BusinessMembersTab } from '@/components/coach/admin/BusinessMembersTab'
import { BusinessApiKeysTab } from '@/components/coach/admin/BusinessApiKeysTab'
import { BusinessReferralsTab } from '@/components/coach/admin/BusinessReferralsTab'
import { BusinessSettingsTab } from '@/components/coach/admin/BusinessSettingsTab'
import { BusinessLocationsTab } from '@/components/coach/admin/BusinessLocationsTab'
import {
  LayoutDashboard,
  Users,
  Key,
  Gift,
  Settings,
  MapPin,
} from 'lucide-react'

interface BusinessAdminClientProps {
  businessName: string
  businessRole: 'OWNER' | 'ADMIN'
}

export function BusinessAdminClient({ businessName, businessRole }: BusinessAdminClientProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {businessName} Admin
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your business locations, members, API keys, referrals, and settings
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Locations</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Referrals</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BusinessOverviewTab />
        </TabsContent>

        <TabsContent value="locations">
          <BusinessLocationsTab />
        </TabsContent>

        <TabsContent value="members">
          <BusinessMembersTab currentUserRole={businessRole} />
        </TabsContent>

        <TabsContent value="api-keys">
          <BusinessApiKeysTab />
        </TabsContent>

        <TabsContent value="referrals">
          <BusinessReferralsTab />
        </TabsContent>

        <TabsContent value="settings">
          <BusinessSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
