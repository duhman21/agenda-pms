'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from './OnboardingProvider'
import { useTenant } from '@/components/auth/TenantProvider'
import { ResponsiveModal } from '@/components/layout/ResponsiveModal'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { CheckCircleIcon, XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

export default function OnboardingModal() {
  const { 
    steps, 
    currentStep, 
    isOnboardingVisible, 
    hideOnboarding, 
    completeStep, 
    progress,
    isOnboardingComplete 
  } = useOnboarding()
  const { profile, tenant } = useTenant()
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  if (!isOnboardingVisible || !profile || !tenant) {
    return null
  }

  const handleNext = () => {
    const step = steps[currentStepIndex]
    if (step) {
      completeStep(step.id)
      
      if (step.href) {
        hideOnboarding()
        router.push(step.href)
        return
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      hideOnboarding()
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleSkip = () => {
    hideOnboarding()
  }

  const handleGoToStep = (href: string) => {
    hideOnboarding()
    router.push(href)
  }

  const step = steps[currentStepIndex]
  if (!step) return null

  return (
    <ResponsiveModal
      isOpen={isOnboardingVisible}
      onClose={handleSkip}
      title="Welcome to Your Property Management System"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Counter */}
        <div className="text-center text-sm text-gray-500">
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        {/* Current Step Content */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {step.completed ? (
              <CheckCircleIconSolid className="w-8 h-8 text-blue-600" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {currentStepIndex + 1}
              </div>
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900">
            {step.title}
          </h3>

          <p className="text-gray-600 max-w-md mx-auto">
            {step.description}
          </p>

          {/* Role-specific welcome message */}
          {step.id === 'welcome' && (
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h4 className="font-medium text-blue-900 mb-2">
                Welcome to {tenant.name}!
              </h4>
              <p className="text-blue-800 text-sm">
                {profile.role === 'admin' && 
                  "As an admin, you have full access to manage properties, team members, and all system features."
                }
                {profile.role === 'staff' && 
                  "As a staff member, you can manage tasks, view calendars, and help maintain properties."
                }
                {profile.role === 'owner' && 
                  "As a property owner, you can view your properties' performance and access financial reports."
                }
              </p>
            </div>
          )}
        </div>

        {/* Step List Overview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Your Setup Progress</h4>
          <div className="space-y-2">
            {steps.map((s, index) => (
              <div 
                key={s.id} 
                className={`flex items-center space-x-3 p-2 rounded ${
                  index === currentStepIndex ? 'bg-blue-100' : ''
                }`}
              >
                {s.completed ? (
                  <CheckCircleIconSolid className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                    index === currentStepIndex 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    s.completed ? 'text-green-700' : 
                    index === currentStepIndex ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {s.title}
                  </p>
                  {s.required && (
                    <span className="text-xs text-orange-600">Required</span>
                  )}
                </div>
                {s.href && !s.completed && (
                  <TouchFriendlyButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGoToStep(s.href!)}
                  >
                    Go
                  </TouchFriendlyButton>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <TouchFriendlyButton
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Previous</span>
          </TouchFriendlyButton>

          <div className="flex space-x-3">
            <TouchFriendlyButton
              variant="ghost"
              onClick={handleSkip}
            >
              Skip for now
            </TouchFriendlyButton>

            <TouchFriendlyButton
              variant="primary"
              onClick={handleNext}
              className="flex items-center space-x-2"
            >
              <span>
                {step.href ? 'Go to ' + step.title : 
                 currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </span>
              {!step.href && <ArrowRightIcon className="w-4 h-4" />}
            </TouchFriendlyButton>
          </div>
        </div>

        {/* Skip All Option */}
        <div className="text-center pt-4 border-t">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            I'll explore on my own
          </button>
        </div>
      </div>
    </ResponsiveModal>
  )
}