import { SupabaseClient } from '@supabase/supabase-js'

// Query optimization utilities
export class QueryOptimizer {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(private supabase: SupabaseClient) {}

  // Cache wrapper for queries
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<{ data: T | null; error: any }> {
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < cached.ttl) {
      return { data: cached.data, error: null }
    }

    const result = await queryFn()
    
    if (result.data && !result.error) {
      this.cache.set(key, {
        data: result.data,
        timestamp: now,
        ttl
      })
    }

    return result
  }

  // Invalidate cache entries
  invalidateCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Optimized property queries with joins
  async getPropertiesWithOwners(tenantId: string) {
    return this.cachedQuery(
      `properties_with_owners_${tenantId}`,
      () => this.supabase
        .from('properties')
        .select(`
          *,
          property_owners (
            ownership_percentage,
            user_profiles (
              id,
              first_name,
              last_name,
              role
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('name')
    )
  }

  // Optimized revenue queries with aggregation
  async getRevenueSummary(tenantId: string, startDate: string, endDate: string, propertyIds?: string[]) {
    const cacheKey = `revenue_summary_${tenantId}_${startDate}_${endDate}_${propertyIds?.join(',') || 'all'}`
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        let query = this.supabase
          .from('bookings')
          .select(`
            revenue,
            property_id,
            check_in,
            source,
            properties (
              name
            )
          `)
          .eq('tenant_id', tenantId)
          .gte('check_in', startDate)
          .lte('check_in', endDate)
          .not('revenue', 'is', null)

        if (propertyIds && propertyIds.length > 0) {
          query = query.in('property_id', propertyIds)
        }

        return query.order('check_in', { ascending: false })
      },
      2 * 60 * 1000 // 2 minutes TTL for financial data
    )
  }

  // Optimized expense queries
  async getExpensesSummary(tenantId: string, startDate: string, endDate: string, propertyIds?: string[]) {
    const cacheKey = `expenses_summary_${tenantId}_${startDate}_${endDate}_${propertyIds?.join(',') || 'all'}`
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        let query = this.supabase
          .from('expenses')
          .select(`
            amount,
            category,
            property_id,
            expense_date,
            properties (
              name
            )
          `)
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)

        if (propertyIds && propertyIds.length > 0) {
          query = query.in('property_id', propertyIds)
        }

        return query.order('expense_date', { ascending: false })
      },
      2 * 60 * 1000 // 2 minutes TTL for financial data
    )
  }

  // Optimized task queries with user info
  async getTasksWithAssignees(tenantId: string, userId?: string) {
    const cacheKey = `tasks_with_assignees_${tenantId}_${userId || 'all'}`
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        let query = this.supabase
          .from('tasks')
          .select(`
            *,
            properties (
              name
            ),
            assigned_user:user_profiles!assigned_to (
              id,
              first_name,
              last_name
            )
          `)
          .eq('tenant_id', tenantId)

        if (userId) {
          query = query.eq('assigned_to', userId)
        }

        return query.order('due_date', { ascending: true })
      },
      1 * 60 * 1000 // 1 minute TTL for task data
    )
  }

  // Batch operations for better performance
  async batchInsert<T>(table: string, records: T[], batchSize: number = 100) {
    const results = []
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const result = await this.supabase
        .from(table)
        .insert(batch)
        .select()
      
      results.push(result)
      
      // Invalidate related cache entries
      this.invalidateCache(table)
    }
    
    return results
  }

  // Optimized pagination
  async getPaginatedResults<T>(
    table: string,
    page: number,
    pageSize: number,
    filters: Record<string, any> = {},
    orderBy?: { column: string; ascending?: boolean }
  ) {
    const from = page * pageSize
    const to = from + pageSize - 1
    
    let query = this.supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(from, to)

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    }

    return query
  }
}

// Singleton instance
let queryOptimizer: QueryOptimizer | null = null

export function getQueryOptimizer(supabase: SupabaseClient): QueryOptimizer {
  if (!queryOptimizer) {
    queryOptimizer = new QueryOptimizer(supabase)
  }
  return queryOptimizer
}