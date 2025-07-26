'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { UserProfile } from '@/types'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = '/',
  loadingComponent,
  unauthorizedComponent
}: RoleGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuthorization() {
      try {
        const { user, profile } = await getCurrentUser()
        
        if (!user || !profile) {
          router.push(fallbackPath)
          return
        }

        const authorized = hasRole(profile.role, allowedRoles)
        setUserProfile(profile)
        setIsAuthorized(authorized)
        
        if (!authorized && !unauthorizedComponent) {
          router.push(fallbackPath)
        }
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push(fallbackPath)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [allowedRoles, fallbackPath, router, unauthorizedComponent])

  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return unauthorizedComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: {allowedRoles.join(', ')}
            {userProfile && ` | Your role: ${userProfile.role}`}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}