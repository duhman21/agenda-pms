'use client'

import { useState, useEffect } from 'react'
import { Property, PropertyOwner, UserProfile } from '@/types'
import { useSmartDefaults, SmartForm } from '@/components/layout/SmartDefaults'
import { FormField, useToast, handleApiError, handleSuccess } from '@/components/layout/ErrorHandling'
import ContextualHelp, { HelpSection } from '@/components/layout/ContextualHelp'

interface PropertyWithOwners extends Property {
  property_owners: (PropertyOwner & {
    user_profiles: UserProfile
  })[]
}

interface PropertyFormProps {
  property?: PropertyWithOwners | null
  onSuccess: () => void
  onCancel: () => void
}

interface OwnerOption {
  id: string
  name: string
  email: string
}

interface SelectedOwner {
  owner_id: string
  ownership_percentage: number
}

export function PropertyForm({ property, onSuccess, onCancel }: PropertyFormProps) {
  const { getPropertyDefaults } = useSmartDefaults()
  const { addToast } = useToast()
  
  const [formData, setFormData] = useState(() => 
    property ? {
      name: property.name,
      address: property.address || '',
      description: property.description || '',
      ical_import_url: property.ical_import_url || ''
    } : getPropertyDefaults()
  )
  const [selectedOwners, setSelectedOwners] = useState<SelectedOwner[]>([])
  const [availableOwners, setAvailableOwners] = useState<OwnerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOwners, setLoadingOwners] = useState(true)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const isEditing = !!property

  // Load form data when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address || '',
        description: property.description || '',
        ical_import_url: property.ical_import_url || ''
      })
      
      setSelectedOwners(
        property.property_owners?.map(owner => ({
          owner_id: owner.owner_id,
          ownership_percentage: owner.ownership_percentage
        })) || []
      )
    } else {
      setFormData({
        name: '',
        address: '',
        description: '',
        ical_import_url: ''
      })
      setSelectedOwners([])
    }
  }, [property])

  // Load available owners
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        setLoadingOwners(true)
        const response = await fetch('/api/users?role=owner')
        if (!response.ok) {
          throw new Error('Failed to fetch owners')
        }
        
        const users = await response.json()
        setAvailableOwners(
          users.map((user: UserProfile) => ({
            id: user.id,
            name: user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}`
              : user.email || 'Unknown',
            email: user.email || ''
          }))
        )
      } catch (err) {
        console.error('Error fetching owners:', err)
      } finally {
        setLoadingOwners(false)
      }
    }

    fetchOwners()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddOwner = () => {
    setSelectedOwners(prev => [...prev, { owner_id: '', ownership_percentage: 0 }])
  }

  const handleRemoveOwner = (index: number) => {
    setSelectedOwners(prev => prev.filter((_, i) => i !== index))
  }

  const handleOwnerChange = (index: number, field: 'owner_id' | 'ownership_percentage', value: string | number) => {
    setSelectedOwners(prev => prev.map((owner, i) => 
      i === index ? { ...owner, [field]: value } : owner
    ))
  }

  const getTotalOwnership = () => {
    return selectedOwners.reduce((total, owner) => total + owner.ownership_percentage, 0)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Property name is required'
    }

    const totalOwnership = getTotalOwnership()
    if (totalOwnership > 100) {
      errors.owners = 'Total ownership percentage cannot exceed 100%'
    }

    // Check for duplicate owners
    const ownerIds = selectedOwners.map(owner => owner.owner_id).filter(id => id)
    const uniqueOwnerIds = new Set(ownerIds)
    if (ownerIds.length !== uniqueOwnerIds.size) {
      errors.owners = 'Cannot assign the same owner multiple times'
    }

    // Check for owners with 0% ownership
    const invalidOwners = selectedOwners.filter(owner => owner.owner_id && owner.ownership_percentage <= 0)
    if (invalidOwners.length > 0) {
      errors.owners = 'All assigned owners must have ownership percentage greater than 0%'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const validOwners = selectedOwners.filter(owner => owner.owner_id && owner.ownership_percentage > 0)
      
      const payload = {
        ...formData,
        owners: validOwners
      }

      const url = isEditing ? `/api/properties/${property.id}` : '/api/properties'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save property')
      }

      handleSuccess(
        isEditing ? 'Property updated successfully' : 'Property created successfully',
        addToast
      )
      onSuccess()
    } catch (err) {
      handleApiError(err, addToast)
    } finally {
      setLoading(false)
    }
  }

  const totalOwnership = getTotalOwnership()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing ? 'Edit Property' : 'Add New Property'}
        </h2>
        <ContextualHelp topic="properties" />
      </div>

      <SmartForm onSubmit={handleSubmit}>
        {/* Property Name */}
        <FormField
          label="Property Name"
          name="name"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          error={validationErrors.name}
          required
          placeholder="Enter property name"
        />

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter property address"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter property description"
          />
        </div>

        {/* iCal Import URL */}
        <div>
          <label htmlFor="ical_import_url" className="block text-sm font-medium text-gray-700 mb-2">
            iCal Import URL
          </label>
          <input
            type="url"
            id="ical_import_url"
            name="ical_import_url"
            value={formData.ical_import_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/calendar.ics"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: URL to import bookings from OTA calendars
          </p>
        </div>

        {/* Property Owners */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Property Owners
            </label>
            <button
              type="button"
              onClick={handleAddOwner}
              disabled={loadingOwners}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
            >
              + Add Owner
            </button>
          </div>

          {loadingOwners ? (
            <div className="text-sm text-gray-500">Loading owners...</div>
          ) : (
            <div className="space-y-3">
              {selectedOwners.map((owner, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                  <select
                    value={owner.owner_id}
                    onChange={(e) => handleOwnerChange(index, 'owner_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select owner...</option>
                    {availableOwners.map((availableOwner) => (
                      <option key={availableOwner.id} value={availableOwner.id}>
                        {availableOwner.name} ({availableOwner.email})
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={owner.ownership_percentage}
                      onChange={(e) => handleOwnerChange(index, 'ownership_percentage', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveOwner(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {selectedOwners.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  No owners assigned. Click &quot;Add Owner&quot; to assign ownership.
                </div>
              )}

              {selectedOwners.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Ownership:</span>
                  <span className={`font-medium ${
                    totalOwnership === 100 ? 'text-green-600' : 
                    totalOwnership > 100 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {totalOwnership}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <HelpSection
          title="Property Management Tips"
          items={[
            {
              question: "How do I connect my OTA calendar?",
              answer: "Add your iCal URL from platforms like Airbnb or Booking.com. The system will sync every 15 minutes to prevent double bookings."
            },
            {
              question: "What if ownership doesn't add up to 100%?",
              answer: "That's okay! You can have partial ownership tracked. Only assigned percentages will be used for revenue attribution."
            },
            {
              question: "Can I change ownership later?",
              answer: "Yes, you can edit property ownership at any time. Changes will apply to future revenue calculations."
            }
          ]}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Property' : 'Create Property'}
          </button>
        </div>
      </SmartForm>
    </div>
  )
}