'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, Tenant } from '@/types'
import { getCurrentUser } from '@/lib/auth'

interface TenantContextType {
  user: User | null
  profile: UserProfile | null
  tenant: Tenant | null
  isLoading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

interface TenantProviderProps {
  children: React.ReactNode
}

export default function TenantProvider({ children }: TenantProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      setIsLoading(true)
      const { user: currentUser, profile: currentProfile, tenant: currentTenant } = await getCurrentUser()
      setUser(currentUser)
      setProfile(currentProfile)
      setTenant(currentTenant)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
      setProfile(null)
      setTenant(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const value: TenantContextType = {
    user,
    profile,
    tenant,
    isLoading,
    isAuthenticated: !!user && !!profile,
    refreshUser
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}