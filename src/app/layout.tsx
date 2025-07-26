import type { Metadata } from 'next'
import './globals.css'
import TenantProvider from '@/components/auth/TenantProvider'
import OnboardingProvider from '@/components/onboarding/OnboardingProvider'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { ToastProvider, ErrorBoundary } from '@/components/layout/ErrorHandling'
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider'
import { SkipLinks } from '@/components/accessibility/SkipLinks'
import { AccessibilityButton } from '@/components/accessibility/AccessibilitySettings'

export const metadata: Metadata = {
  title: 'Agenda PMS - Property Management System',
  description: 'A comprehensive property management system for small to mid-sized property managers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <AccessibilityProvider>
            <SkipLinks />
            <ToastProvider>
              <TenantProvider>
                <OnboardingProvider>
                  <main id="main-content" tabIndex={-1}>
                    {children}
                  </main>
                  <OnboardingModal />
                  <AccessibilityButton />
                </OnboardingProvider>
              </TenantProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}