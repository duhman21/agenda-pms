'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
  mobileRender?: (value: any, row: any) => React.ReactNode
  hideOnMobile?: boolean
}

interface MobileDataTableProps {
  data: any[]
  columns: Column[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  className?: string
}

export function MobileDataTable({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className
}: MobileDataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  'hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row, index) => (
          <div
            key={index}
            className={cn(
              'bg-white rounded-lg border border-gray-200 p-4 shadow-sm',
              onRowClick && 'cursor-pointer hover:shadow-md active:bg-gray-50 transition-all'
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns
              .filter(column => !column.hideOnMobile)
              .map((column) => (
                <div key={column.key} className="flex justify-between items-start mb-2 last:mb-0">
                  <div className="text-sm font-medium text-gray-500 mr-4 min-w-0 flex-shrink-0">
                    {column.label}:
                  </div>
                  <div className="text-sm text-gray-900 text-right min-w-0 flex-1">
                    {column.mobileRender 
                      ? column.mobileRender(row[column.key], row)
                      : column.render 
                        ? column.render(row[column.key], row) 
                        : row[column.key]
                    }
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Mobile-optimized list component
interface MobileListProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function MobileList({
  items,
  renderItem,
  loading = false,
  emptyMessage = 'No items available',
  className
}: MobileListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  )
}

// Mobile-optimized pagination
interface MobilePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function MobilePagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: MobilePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        Previous
      </button>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        Next
      </button>
    </div>
  )
}