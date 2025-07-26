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
import NotificationCenter from '@/components/ui/NotificationCenter'

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
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <NotificationCenter />
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
                  <div className={`${action.color} text-white p-4 sm:p-6 rounded-lg transition-all duration-200 group-hover:shadow-lg group-hover:scale-105 group-active:scale-95 transform`}>
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

          {/* Dashboard Stats */}
          <ResponsiveCard>
            <ResponsiveCardHeader 
              title="Overview"
              subtitle="Key metrics at a glance"
            />
            <ResponsiveCardGrid columns={2} className="sm:grid-cols-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Properties</p>
                    <p className="text-2xl font-bold text-blue-900">12</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🏠</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">+2 this month</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Bookings</p>
                    <p className="text-2xl font-bold text-green-900">8</p>
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">📅</span>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">85% occupancy</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Pending Tasks</p>
                    <p className="text-2xl font-bold text-purple-900">5</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">2 overdue</p>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-emerald-900">$24.5K</p>
                  </div>
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">💰</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-600 mt-2">+12% vs last month</p>
              </div>
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