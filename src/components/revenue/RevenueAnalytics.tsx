'use client';

import { useState, useEffect } from 'react';
import { RevenueSummary, UserProfile } from '@/types';

interface RevenueAnalyticsProps {
  userProfile: UserProfile;
}

export default function RevenueAnalytics({ userProfile }: RevenueAnalyticsProps) {
  const [analytics, setAnalytics] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedProperty]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_by: timeRange
      });

      if (selectedProperty) {
        params.append('property_id', selectedProperty);
      }

      const response = await fetch(`/api/revenue/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateGrowthRate = (trends: any[]) => {
    if (trends.length < 2) return 0;
    
    const current = trends[trends.length - 1]?.total_revenue || 0;
    const previous = trends[trends.length - 2]?.total_revenue || 0;
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return ((current - previous) / previous) * 100;
  };

  const getTopPerformingProperty = () => {
    if (!analytics?.revenue_by_property.length) return null;
    
    return analytics.revenue_by_property.reduce((top, current) => 
      current.total_revenue > top.total_revenue ? current : top
    );
  };

  const getAverageBookingValue = () => {
    if (!analytics?.revenue_by_property.length) return 0;
    
    const totalBookings = analytics.revenue_by_property.reduce(
      (sum, prop) => sum + prop.booking_count, 0
    );
    
    return totalBookings > 0 ? analytics.total_revenue / totalBookings : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No analytics data available.</p>
      </div>
    );
  }

  const growthRate = calculateGrowthRate(analytics.revenue_trends);
  const topProperty = getTopPerformingProperty();
  const avgBookingValue = getAverageBookingValue();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Revenue Analytics</h2>
        <div className="flex space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.total_revenue)}
              </p>
            </div>
            <div className="ml-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
          {growthRate !== 0 && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs previous period</span>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Average Booking Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(avgBookingValue)}
              </p>
            </div>
            <div className="ml-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.booking_count}
              </p>
            </div>
            <div className="ml-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Top Property</p>
              <p className="text-lg font-bold text-gray-900">
                {topProperty?.property_name || 'N/A'}
              </p>
              {topProperty && (
                <p className="text-sm text-gray-500">
                  {formatCurrency(topProperty.total_revenue)}
                </p>
              )}
            </div>
            <div className="ml-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      {analytics.revenue_trends.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
          <div className="space-y-4">
            {analytics.revenue_trends.map((trend, index) => {
              const maxRevenue = Math.max(...analytics.revenue_trends.map(t => t.total_revenue));
              const widthPercentage = maxRevenue > 0 ? (trend.total_revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={trend.period} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium text-gray-600">
                    {trend.period}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-4 relative">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-24 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(trend.total_revenue)}
                  </div>
                  <div className="w-16 text-sm text-gray-500 text-right">
                    {trend.booking_count} bookings
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Property Performance */}
      {analytics.revenue_by_property.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg/Booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.revenue_by_property
                  .sort((a, b) => b.total_revenue - a.total_revenue)
                  .map((property) => {
                    const avgPerBooking = property.total_revenue / property.booking_count;
                    const performanceScore = (property.total_revenue / analytics.total_revenue) * 100;
                    
                    return (
                      <tr key={property.property_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {property.property_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(property.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {property.booking_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(avgPerBooking)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${performanceScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {performanceScore.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Owner Revenue Distribution (Admin/Staff only) */}
      {['admin', 'staff'].includes(userProfile.role) && analytics.revenue_by_owner.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Owner Revenue Distribution</h3>
          <div className="space-y-4">
            {analytics.revenue_by_owner
              .sort((a, b) => b.total_revenue - a.total_revenue)
              .map((owner) => {
                const percentage = (owner.total_revenue / analytics.total_revenue) * 100;
                
                return (
                  <div key={owner.owner_id} className="flex items-center space-x-4">
                    <div className="w-32 text-sm font-medium text-gray-900">
                      {owner.owner_name}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(owner.total_revenue)}
                    </div>
                    <div className="w-16 text-sm text-gray-500 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}