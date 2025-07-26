'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/components/auth/TenantProvider'
import { MobileNavigation } from './MobileNavigation'
import { DesktopNavigation } from './DesktopNavigation'
import { useRouter } from 'next/navigation'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user, profile, tenant } = useTenant()
  const router = useRouter()

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user || !profile || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      {isMobile ? (
        <MobileNavigation
          user={user}
          profile={profile}
          tenant={tenant}
          isMenuOpen={isMobileMenuOpen}
          setIsMenuOpen={setIsMobileMenuOpen}
          onLogout={handleLogout}
        />
      ) : (
        <DesktopNavigation
          user={user}
          profile={profile}
          tenant={tenant}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content */}
      <div className={`${isMobile ? 'pt-16' : 'lg:pl-64'} transition-all duration-300`}>
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>

      {/* Mobile menu overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}