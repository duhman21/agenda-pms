'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTenant } from '@/components/auth/TenantProvider'
import { TouchFriendlyButton } from './TouchFriendlyButton'
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  CalendarIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ReceiptPercentIcon,
  UsersIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['admin', 'staff', 'owner'],
    description: 'Overview and quick actions'
  },
  {
    id: 'properties',
    label: 'Properties',
    href: '/properties',
    icon: BuildingOfficeIcon,
    roles: ['admin', 'staff', 'owner'],
    description: 'Manage your property portfolio'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
    roles: ['admin', 'staff'],
    description: 'View bookings and availability'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    roles: ['admin', 'staff'],
    description: 'Manage cleaning and maintenance'
  },
  {
    id: 'revenue',
    label: 'Revenue',
    href: '/revenue',
    icon: CurrencyDollarIcon,
    roles: ['admin', 'staff'],
    description: 'Track income and performance'
  },
  {
    id: 'expenses',
    label: 'Expenses',
    href: '/expenses',
    icon: ReceiptPercentIcon,
    roles: ['admin', 'staff'],
    description: 'Log costs and receipts'
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: DocumentChartBarIcon,
    roles: ['admin', 'staff', 'owner'],
    description: 'Financial reports and analytics'
  },
  {
    id: 'users',
    label: 'Team',
    href: '/users',
    icon: UsersIcon,
    roles: ['admin'],
    description: 'Manage team members and owners'
  }
]

export function useNavigation() {
  const { profile } = useTenant()
  const router = useRouter()
  const pathname = usePathname()

  const availableItems = navigationItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  )

  const currentItem = availableItems.find(item => pathname.startsWith(item.href))

  const navigateTo = (href: string) => {
    router.push(href)
  }

  const goBack = () => {
    router.back()
  }

  const goHome = () => {
    router.push('/dashboard')
  }

  return {
    items: availableItems,
    currentItem,
    navigateTo,
    goBack,
    goHome,
    pathname
  }
}

interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
  }>
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const { navigateTo } = useNavigation()

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <span className="text-gray-400">/</span>
          )}
          {item.href ? (
            <button
              onClick={() => navigateTo(item.href!)}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

interface BackButtonProps {
  label?: string
  href?: string
  className?: string
}

export function BackButton({ label = 'Back', href, className = '' }: BackButtonProps) {
  const { goBack, navigateTo } = useNavigation()

  const handleClick = () => {
    if (href) {
      navigateTo(href)
    } else {
      goBack()
    }
  }

  return (
    <TouchFriendlyButton
      variant="ghost"
      onClick={handleClick}
      className={`flex items-center space-x-2 ${className}`}
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span>{label}</span>
    </TouchFriendlyButton>
  )
}

interface QuickNavigationProps {
  currentSection?: string
  className?: string
}

export function QuickNavigation({ currentSection, className = '' }: QuickNavigationProps) {
  const { items, navigateTo, pathname } = useNavigation()

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto py-4">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.href)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                  whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
  showBackButton?: boolean
  backButtonHref?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  showBackButton = false,
  backButtonHref,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Back Button */}
            {showBackButton && (
              <div className="pt-1">
                <BackButton href={backButtonHref} />
              </div>
            )}

            {/* Title and Description */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-gray-600">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get navigation context for current page
export function getNavigationContext(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 0 || segments[0] === 'dashboard') {
    return {
      section: 'dashboard',
      title: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard' }]
    }
  }

  const section = segments[0]
  const item = navigationItems.find(nav => nav.href === `/${section}`)
  
  if (!item) {
    return {
      section: 'unknown',
      title: 'Page',
      breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Page' }]
    }
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: item.label, href: segments.length === 1 ? undefined : item.href }
  ]

  // Add sub-page breadcrumbs
  if (segments.length > 1) {
    const subPage = segments[1]
    breadcrumbs.push({ 
      label: subPage.charAt(0).toUpperCase() + subPage.slice(1) 
    })
  }

  return {
    section,
    title: item.label,
    breadcrumbs
  }
}