'use client';

/**
 * VBT Dashboard Component
 *
 * Main dashboard for Velocity-Based Training data:
 * - Upload VBT CSV files
 * - View session history
 * - View load-velocity profiles
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VBTUploadWidget } from './VBTUploadWidget';
import { VBTSessionHistory } from './VBTSessionHistory';
import { Upload, History, TrendingUp } from 'lucide-react';

interface VBTDashboardProps {
  clientId: string;
}

export function VBTDashboard({ clientId }: VBTDashboardProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = useCallback(() => {
    // Switch to history tab and refresh
    setActiveTab('history');
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Ladda upp
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <VBTUploadWidget
            clientId={clientId}
            onUploadComplete={handleUploadComplete}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <VBTSessionHistory
            key={refreshKey}
            clientId={clientId}
            limit={20}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
