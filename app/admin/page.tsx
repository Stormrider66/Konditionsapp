// app/admin/page.tsx
import { requireAdmin } from '@/lib/auth-utils';
import { getTranslations } from '@/i18n/server';
import { AdminDashboardClient } from './AdminDashboardClient';

export default async function AdminPage() {
  const user = await requireAdmin();
  const t = await getTranslations('admin');

  return (
    <AdminDashboardClient
      userId={user.id}
      userName={user.name || 'Admin'}
    />
  );
}
