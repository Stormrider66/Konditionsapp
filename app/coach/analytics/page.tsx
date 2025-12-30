// app/coach/analytics/page.tsx
import { requireCoach } from '@/lib/auth-utils';
import { getTranslations } from '@/i18n/server';
import { AnalyticsDashboardClient } from './AnalyticsDashboardClient';

export default async function AnalyticsPage() {
  const user = await requireCoach();
  const t = await getTranslations('analytics');

  return (
    <AnalyticsDashboardClient
      userId={user.id}
      userName={user.name || 'Coach'}
    />
  );
}
