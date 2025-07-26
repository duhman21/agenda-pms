'use client'

import { ResponsiveLayout } from './ResponsiveLayout'

interface ClientResponsiveLayoutProps {
  children: React.ReactNode
}

export function ClientResponsiveLayout({ children }: ClientResponsiveLayoutProps) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>
}