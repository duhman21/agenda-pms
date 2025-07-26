'use client'

// Client-side caching strategy for frequently accessed data
export class ClientCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  // Set cache entry
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // Remove cache entry
  delete(key: string) {
    this.cache.delete(key)
  }

  // Clear all cache entries
  clear() {
    this.cache.clear()
  }

  // Clear cache entries matching pattern
  clearPattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++
      } else {
        expiredEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    }
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton cache instance
const clientCache = new ClientCache()

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    clientCache.cleanup()
  }, 5 * 60 * 1000)
}

export { clientCache }

// React hook for cached data fetching
import { useState, useEffect, useCallback } from 'react'

export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = clientCache.get<T>(key)
      if (cached) {
        setData(cached)
        return cached
      }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn()
      clientCache.set(key, result, ttl)
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [key, fetchFn, ttl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => fetchData(true), [fetchData])
  const invalidate = useCallback(() => {
    clientCache.delete(key)
    setData(null)
  }, [key])

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  }
}

// Cache keys for different data types
export const CacheKeys = {
  PROPERTIES: (tenantId: string) => `properties_${tenantId}`,
  PROPERTY_OWNERS: (tenantId: string) => `property_owners_${tenantId}`,
  TASKS: (tenantId: string, userId?: string) => `tasks_${tenantId}_${userId || 'all'}`,
  REVENUE_SUMMARY: (tenantId: string, period: string) => `revenue_summary_${tenantId}_${period}`,
  EXPENSE_SUMMARY: (tenantId: string, period: string) => `expense_summary_${tenantId}_${period}`,
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
  CALENDAR_BOOKINGS: (propertyId: string, month: string) => `calendar_bookings_${propertyId}_${month}`,
  SYNC_STATUS: (tenantId: string) => `sync_status_${tenantId}`,
} as const

// Cache invalidation helpers
export const CacheInvalidation = {
  onPropertyChange: (tenantId: string) => {
    clientCache.clearPattern(`properties_${tenantId}`)
    clientCache.clearPattern(`property_owners_${tenantId}`)
    clientCache.clearPattern(`calendar_bookings_`)
  },
  
  onTaskChange: (tenantId: string) => {
    clientCache.clearPattern(`tasks_${tenantId}`)
  },
  
  onRevenueChange: (tenantId: string) => {
    clientCache.clearPattern(`revenue_summary_${tenantId}`)
    clientCache.clearPattern(`calendar_bookings_`)
  },
  
  onExpenseChange: (tenantId: string) => {
    clientCache.clearPattern(`expense_summary_${tenantId}`)
  },
  
  onUserChange: (tenantId: string) => {
    clientCache.clearPattern(`user_profile_`)
    clientCache.clearPattern(`tasks_${tenantId}`)
  },
  
  onCalendarSync: (tenantId: string) => {
    clientCache.clearPattern(`calendar_bookings_`)
    clientCache.clearPattern(`sync_status_${tenantId}`)
  }
} as const