import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import RevenueForm from '@/components/revenue/RevenueForm';
import { ClientResponsiveLayout } from '@/components/layout/ClientResponsiveLayout';
import { ResponsiveCard, ResponsiveCardHeader } from '@/components/layout/ResponsiveCard';

// Lazy load heavy components
import { LazyRevenueDashboard, LazyRevenueAnalytics, LazyRevenueAuditTrail } from '@/components/lazy/LazyReports';

export default async function RevenuePage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login');
  }

  return (
    <ClientResponsiveLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <ResponsiveCard>
          <ResponsiveCardHeader 
            title="Revenue Management"
            subtitle="Track and analyze your property revenue"
          />
        </ResponsiveCard>

        {/* Revenue Form - Only for admin and staff */}
        {['admin', 'staff'].includes(profile.role) && (
          <ResponsiveCard>
            <ResponsiveCardHeader 
              title="Record New Revenue"
              subtitle="Add revenue entries for your properties"
            />
            <RevenueForm />
          </ResponsiveCard>
        )}

        {/* Revenue Dashboard */}
        <LazyRevenueDashboard userProfile={profile} />

        {/* Revenue Analytics */}
        <LazyRevenueAnalytics userProfile={profile} />

        {/* Revenue Audit Trail - Only for admin and staff */}
        {['admin', 'staff'].includes(profile.role) && (
          <LazyRevenueAuditTrail userProfile={profile} />
        )}
      </div>
    </ClientResponsiveLayout>
  );
}