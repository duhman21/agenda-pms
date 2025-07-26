'use client'

import { useState, useEffect, useCallback } from 'react'
import { Property, PropertyOwner, UserProfile } from '@/types'
import { PropertyCard } from './PropertyCard'
import { PropertyForm } from './PropertyForm'
import { PropertySearch } from './PropertySearch'
import { ResponsiveCard, ResponsiveCardHeader, ResponsiveCardGrid } from '@/components/layout/ResponsiveCard'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { ResponsiveModal, ModalContent } from '@/components/layout/ResponsiveModal'
import { MobilePagination } from '@/components/layout/MobileDataTable'
import { PullToRefresh, useIsMobile } from '@/components/layout/MobileOptimizations'
import { MobileErrorBoundary } from '@/components/layout/MobileErrorBoundary'
import { PropertiesEmptyState } from '@/components/onboarding/EmptyState'

interface PropertyWithOwners extends Property {
  property_owners: (PropertyOwner & {
    user_profiles: UserProfile
  })[]
}

interface PropertyListProps {
  userRole: 'admin' | 'staff' | 'owner'
  userId: string
}

export function PropertyList({ userRole, userId }: PropertyListProps) {
  const [properties, setProperties] = useState<PropertyWithOwners[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<PropertyWithOwners | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const isMobile = useIsMobile()

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (ownerFilter) {
        params.append('owner_id', ownerFilter)
      }

      // If user is an owner, filter to only their properties
      if (userRole === 'owner') {
        params.append('owner_id', userId)
      }

      const response = await fetch(`/api/properties?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }

      const data = await response.json()
      setProperties(data.properties)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, ownerFilter, userRole, userId])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleCreateProperty = () => {
    setEditingProperty(null)
    setShowForm(true)
  }

  const handleEditProperty = (property: PropertyWithOwners) => {
    setEditingProperty(property)
    setShowForm(true)
  }

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete property')
      }

      // Refresh the list
      fetchProperties()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete property')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingProperty(null)
    fetchProperties()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingProperty(null)
  }

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleRefresh = async () => {
    await fetchProperties()
  }

  return (
    <MobileErrorBoundary>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
          {/* Header */}
          <ResponsiveCard>
            <ResponsiveCardHeader
              title="Properties"
              subtitle={`${properties.length} properties found`}
              action={
                userRole === 'admin' && (
                  <TouchFriendlyButton
                    onClick={handleCreateProperty}
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    Add Property
                  </TouchFriendlyButton>
                )
              }
            />
          </ResponsiveCard>

          {/* Search and Filters */}
          <ResponsiveCard>
            <PropertySearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              ownerFilter={ownerFilter}
              onOwnerFilterChange={setOwnerFilter}
              userRole={userRole}
            />
          </ResponsiveCard>

          {/* Error Message */}
          {error && (
            <ResponsiveCard className="bg-red-50 border-red-200">
              <div className="text-red-700">
                <strong>Error:</strong> {error}
              </div>
            </ResponsiveCard>
          )}

          {/* Property Form Modal */}
          <ResponsiveModal
            isOpen={showForm}
            onClose={handleFormCancel}
            title={editingProperty ? 'Edit Property' : 'Add New Property'}
            size="lg"
          >
            <ModalContent>
              <PropertyForm
                property={editingProperty}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </ModalContent>
          </ResponsiveModal>

          {/* Properties Grid */}
          {properties.length === 0 && !loading ? (
            searchTerm || ownerFilter ? (
              <ResponsiveCard className="text-center py-12">
                <div className="text-gray-500 text-base sm:text-lg mb-4">
                  No properties found matching your criteria
                </div>
              </ResponsiveCard>
            ) : (
              <PropertiesEmptyState onAddProperty={handleCreateProperty} />
            )
          ) : (
            <ResponsiveCardGrid columns={isMobile ? 1 : 3}>
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  userRole={userRole}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                />
              ))}
            </ResponsiveCardGrid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <ResponsiveCard>
              <MobilePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </ResponsiveCard>
          )}

          {/* Loading overlay for pagination */}
          {loading && properties.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </MobileErrorBoundary>
  )
}