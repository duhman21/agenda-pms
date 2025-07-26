'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useTenant } from '@/components/auth/TenantProvider'

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
  href?: string
  action?: () => void
}

interface OnboardingContextType {
  steps: OnboardingStep[]
  currentStep: OnboardingStep | null
  isOnboardingComplete: boolean
  isOnboardingVisible: boolean
  showOnboarding: () => void
  hideOnboarding: () => void
  completeStep: (stepId: string) => void
  resetOnboarding: () => void
  progress: number
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

interface OnboardingProviderProps {
  children: React.ReactNode
}

export default function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { profile, tenant, isAuthenticated } = useTenant()
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  // Define onboarding steps based on user role
  const getStepsForRole = (role: string): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to the Platform',
        description: 'Get familiar with your property management dashboard',
        completed: false,
        required: true
      },
      {
        id: 'profile',
        title: 'Complete Your Profile',
        description: 'Add your name and contact information',
        completed: false,
        required: true,
        href: '/profile'
      }
    ]

    if (role === 'admin') {
      return [
        ...baseSteps,
        {
          id: 'add-property',
          title: 'Add Your First Property',
          description: 'Start by adding a property to manage',
          completed: false,
          required: true,
          href: '/properties'
        },
        {
          id: 'setup-calendar',
          title: 'Connect Calendar Sync',
          description: 'Sync with your OTA calendars to prevent double bookings',
          completed: false,
          required: false,
          href: '/properties'
        },
        {
          id: 'invite-team',
          title: 'Invite Team Members',
          description: 'Add staff members and property owners to your team',
          completed: false,
          required: false,
          href: '/users'
        },
        {
          id: 'explore-features',
          title: 'Explore Key Features',
          description: 'Learn about tasks, revenue tracking, and reporting',
          completed: false,
          required: false
        }
      ]
    } else if (role === 'staff') {
      return [
        ...baseSteps,
        {
          id: 'view-tasks',
          title: 'Check Your Tasks',
          description: 'See tasks assigned to you and learn how to manage them',
          completed: false,
          required: true,
          href: '/tasks'
        },
        {
          id: 'understand-calendar',
          title: 'Understand the Calendar',
          description: 'Learn how to view bookings and schedule tasks',
          completed: false,
          required: false,
          href: '/calendar'
        }
      ]
    } else if (role === 'owner') {
      return [
        ...baseSteps,
        {
          id: 'view-properties',
          title: 'View Your Properties',
          description: 'See the properties you own and their performance',
          completed: false,
          required: true,
          href: '/properties'
        },
        {
          id: 'check-reports',
          title: 'Access Your Reports',
          description: 'Learn how to view financial reports for your properties',
          completed: false,
          required: false,
          href: '/reports'
        }
      ]
    }

    return baseSteps
  }

  const [steps, setSteps] = useState<OnboardingStep[]>([])

  // Initialize steps when user data is available
  useEffect(() => {
    if (profile?.role) {
      const roleSteps = getStepsForRole(profile.role)
      setSteps(roleSteps)
      
      // Check if user should see onboarding
      const hasCompletedProfile = profile.first_name && profile.last_name
      const shouldShowOnboarding = !hasCompletedProfile || roleSteps.some(step => step.required && !completedSteps.has(step.id))
      
      if (shouldShowOnboarding && isAuthenticated) {
        setIsOnboardingVisible(true)
      }
    }
  }, [profile, isAuthenticated, completedSteps])

  // Load completed steps from localStorage
  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`onboarding-${profile.id}`)
      if (saved) {
        try {
          const savedSteps = JSON.parse(saved)
          setCompletedSteps(new Set(savedSteps))
        } catch (error) {
          console.error('Failed to load onboarding progress:', error)
        }
      }
    }
  }, [profile?.id])

  // Save completed steps to localStorage
  useEffect(() => {
    if (profile?.id && completedSteps.size > 0) {
      localStorage.setItem(`onboarding-${profile.id}`, JSON.stringify([...completedSteps]))
    }
  }, [completedSteps, profile?.id])

  const completeStep = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]))
  }

  const resetOnboarding = () => {
    setCompletedSteps(new Set())
    if (profile?.id) {
      localStorage.removeItem(`onboarding-${profile.id}`)
    }
    setIsOnboardingVisible(true)
  }

  const showOnboarding = () => setIsOnboardingVisible(true)
  const hideOnboarding = () => setIsOnboardingVisible(false)

  // Update steps with completion status
  const updatedSteps = steps.map(step => ({
    ...step,
    completed: completedSteps.has(step.id)
  }))

  const currentStep = updatedSteps.find(step => !step.completed) || null
  const completedCount = updatedSteps.filter(step => step.completed).length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0
  const isOnboardingComplete = updatedSteps.every(step => step.completed || !step.required)

  const value: OnboardingContextType = {
    steps: updatedSteps,
    currentStep,
    isOnboardingComplete,
    isOnboardingVisible,
    showOnboarding,
    hideOnboarding,
    completeStep,
    resetOnboarding,
    progress
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}