'use client'

import { Property, PropertyOwner, UserProfile } from '@/types'

interface PropertyWithOwners extends Property {
  property_owners: (PropertyOwner & {
    user_profiles: UserProfile
  })[]
}

interface PropertyCardProps {
  property: PropertyWithOwners
  userRole: 'admin' | 'staff' | 'owner'
  onEdit: (property: PropertyWithOwners) => void
  onDelete: (propertyId: string) => void
}

export function PropertyCard({ property, userRole, onEdit, onDelete }: PropertyCardProps) {
  const formatOwners = () => {
    if (!property.property_owners || property.property_owners.length === 0) {
      return 'No owners assigned'
    }

    return property.property_owners.map(owner => {
      const profile = owner.user_profiles
      const name = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.email || 'Unknown Owner'
      
      return `${name} (${owner.ownership_percentage}%)`
    }).join(', ')
  }

  const getTotalOwnership = () => {
    if (!property.property_owners || property.property_owners.length === 0) {
      return 0
    }
    return property.property_owners.reduce((total, owner) => total + owner.ownership_percentage, 0)
  }

  const totalOwnership = getTotalOwnership()
  const isOwnershipComplete = totalOwnership === 100

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Property Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {property.name}
          </h3>
          {property.address && (
            <p className="text-sm text-gray-600 mb-2">
              📍 {property.address}
            </p>
          )}
        </div>
        
        {userRole === 'admin' && (
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => onEdit(property)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              title="Edit property"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(property.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
              title="Delete property"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Property Description */}
      {property.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-3">
          {property.description}
        </p>
      )}

      {/* Ownership Information */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Ownership</span>
          <span className={`text-sm font-medium ${
            isOwnershipComplete ? 'text-green-600' : 'text-amber-600'
          }`}>
            {totalOwnership}%
          </span>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          {formatOwners()}
        </div>

        {!isOwnershipComplete && userRole === 'admin' && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
            <p className="text-xs text-amber-700">
              ⚠️ Ownership incomplete ({100 - totalOwnership}% unassigned)
            </p>
          </div>
        )}
      </div>

      {/* iCal Integration Status */}
      {property.ical_import_url && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            iCal sync enabled
          </div>
        </div>
      )}

      {/* Property Metadata */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Created: {new Date(property.created_at).toLocaleDateString()}</span>
          {property.updated_at !== property.created_at && (
            <span>Updated: {new Date(property.updated_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}