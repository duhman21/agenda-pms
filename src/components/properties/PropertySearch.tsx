'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@/types'

interface PropertySearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  ownerFilter: string
  onOwnerFilterChange: (ownerId: string) => void
  userRole: 'admin' | 'staff' | 'owner'
}

export function PropertySearch({ 
  searchTerm, 
  onSearchChange, 
  ownerFilter, 
  onOwnerFilterChange,
  userRole 
}: PropertySearchProps) {
  const [owners, setOwners] = useState<UserProfile[]>([])
  const [loadingOwners, setLoadingOwners] = useState(false)

  // Load owners for filter dropdown (only for admin and staff)
  useEffect(() => {
    if (userRole === 'owner') return

    const fetchOwners = async () => {
      try {
        setLoadingOwners(true)
        const response = await fetch('/api/users?role=owner')
        if (response.ok) {
          const data = await response.json()
          setOwners(data)
        }
      } catch (error) {
        console.error('Error fetching owners:', error)
      } finally {
        setLoadingOwners(false)
      }
    }

    fetchOwners()
  }, [userRole])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  const handleOwnerFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOwnerFilterChange(e.target.value)
  }

  const clearFilters = () => {
    onSearchChange('')
    onOwnerFilterChange('')
  }

  const hasActiveFilters = searchTerm || ownerFilter

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search properties
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search properties by name, address, or description..."
            />
          </div>
        </div>

        {/* Owner Filter - Only show for admin and staff */}
        {userRole !== 'owner' && (
          <div className="sm:w-64">
            <label htmlFor="owner-filter" className="sr-only">
              Filter by owner
            </label>
            <select
              id="owner-filter"
              value={ownerFilter}
              onChange={handleOwnerFilterChange}
              disabled={loadingOwners}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">All owners</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.first_name && owner.last_name 
                    ? `${owner.first_name} ${owner.last_name}`
                    : owner.email || 'Unknown Owner'
                  }
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-center">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchTerm && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: &quot;{searchTerm}&quot;
              <button
                onClick={() => onSearchChange('')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:text-blue-600 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          )}
          
          {ownerFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Owner: {owners.find(o => o.id === ownerFilter)?.first_name && owners.find(o => o.id === ownerFilter)?.last_name
                ? `${owners.find(o => o.id === ownerFilter)?.first_name} ${owners.find(o => o.id === ownerFilter)?.last_name}`
                : owners.find(o => o.id === ownerFilter)?.email || 'Unknown'
              }
              <button
                onClick={() => onOwnerFilterChange('')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:text-green-600 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}