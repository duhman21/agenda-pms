import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { ClientResponsiveLayout } from '@/components/layout/ClientResponsiveLayout'

// Lazy load heavy components
import { LazyPropertyList } from '@/components/lazy/LazyManagement'

export default async function PropertiesPage() {
  const { user, profile } = await getCurrentUser()
  
  if (!user || !profile) {
    redirect('/login')
  }

  return (
    <ClientResponsiveLayout>
      <LazyPropertyList userRole={profile.role} userId={user.id} />
    </ClientResponsiveLayout>
  )
}