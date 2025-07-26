'use client'

import { useRouter } from 'next/navigation'
import { useTenant } from '@/components/auth/TenantProvider'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import RoleGuard from '@/components/auth/RoleGuard'
import OverdueTaskNotifications from '@/components/tasks/OverdueTaskNotifications'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'
import { ResponsiveCard, ResponsiveCardHeader, ResponsiveCardGrid } from '@/components/layout/ResponsiveCard'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { PageHeader } from '@/components/layout/NavigationHelper'

export default function DashboardPage() {
  const { user, profile, tenant } = useTenant()
  const { showOnboarding, completeStep } = useOnboarding()
  const router = useRouter()

  // Handle loading state
  if (!user || !profile || !tenant) {
    return (
      <RoleGuard allowedRoles={['admin', 'staff', 'owner']}>
        <ResponsiveLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </ResponsiveLayout>
      </RoleGuard>
    )
  }

  const quickActions = [
    {
      title: 'Manage Properties',
      description: 'Add and manage your properties',
      color: 'bg-blue-600 hover:bg-blue-700',
      href: '/properties'
    },
    {
      title: 'View Calendar',
      description: 'Check bookings and availability',
      color: 'bg-green-600 hover:bg-green-700',
      href: '/calendar'
    },
    {
      title: 'Manage Tasks',
      description: 'View and assign tasks',
      color: 'bg-purple-600 hover:bg-purple-700',
      href: '/tasks'
    },
    {
      title: 'Track Revenue',
      description: 'Monitor financial performance',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      href: '/revenue'
    },
    {
      title: 'Log Expenses',
      description: 'Record property expenses',
      color: 'bg-orange-600 hover:bg-orange-700',
      href: '/expenses'
    }
  ]

  return (
    <RoleGuard allowedRoles={['admin', 'staff', 'owner']}>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Welcome to {tenant.name}
                </h1>
                <p className="text-gray-600">
                  Manage your properties efficiently from one place
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <TouchFriendlyButton
                  variant="ghost"
                  size="sm"
                  onClick={showOnboarding}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Show Getting Started Guide
                </TouchFriendlyButton>
              </div>
            </div>
          </div>
          
          {/* Overdue Task Notifications */}
          <OverdueTaskNotifications maxItems={5} />

          {/* User Information Card */}
          <ResponsiveCard>
            <ResponsiveCardHeader 
              title="User Information"
              subtitle="Your account details and role"
            />
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-base font-medium text-gray-900">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-base font-medium text-gray-900 truncate">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-base font-medium text-gray-900 capitalize">
                  {profile.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                <dd className="mt-1 text-base font-medium text-gray-900 truncate">
                  {tenant.name}
                </dd>
              </div>
            </dl>
          </ResponsiveCard>

          {/* Quick Actions */}
          <ResponsiveCard>
            <ResponsiveCardHeader 
              title="Quick Actions"
              subtitle="Jump to common tasks"
            />
            <ResponsiveCardGrid columns={2} className="sm:grid-cols-3">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="group cursor-pointer"
                  onClick={() => router.push(action.href)}
                >
                  <div className={`${action.color} text-white p-4 sm:p-6 rounded-lg transition-all duration-200 group-hover:shadow-lg group-active:scale-95`}>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm opacity-90">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </ResponsiveCardGrid>
          </ResponsiveCard>

          {/* Mobile-specific help section */}
          <div className="block sm:hidden">
            <ResponsiveCard>
              <ResponsiveCardHeader 
                title="Getting Started"
                subtitle="Tips for mobile users"
              />
              <div className="space-y-3 text-sm text-gray-600">
                <p>• Swipe left on list items for quick actions</p>
                <p>• Use the hamburger menu to navigate between sections</p>
                <p>• Tap and hold on cards for additional options</p>
                <p>• Pull down to refresh data in lists</p>
              </div>
            </ResponsiveCard>
          </div>
        </div>
      </ResponsiveLayout>
    </RoleGuard>
  )
}