'use client'

import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { ResponsiveModal, ModalContent } from '@/components/layout/ResponsiveModal'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Mock notifications - in real app, this would come from API/WebSocket
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Overdue Task',
        message: 'Cleaning task for Property A is 2 days overdue',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: false,
        actionUrl: '/tasks',
        actionLabel: 'View Task'
      },
      {
        id: '2',
        type: 'info',
        title: 'New Booking',
        message: 'New booking received for Property B from March 15-20',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
        actionUrl: '/calendar',
        actionLabel: 'View Calendar'
      },
      {
        id: '3',
        type: 'success',
        title: 'Payment Received',
        message: 'Monthly payment of $2,500 received from Property C',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true,
        actionUrl: '/revenue',
        actionLabel: 'View Revenue'
      },
      {
        id: '4',
        type: 'error',
        title: 'Calendar Sync Failed',
        message: 'Unable to sync with Airbnb calendar for Property D',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        read: false,
        actionUrl: '/properties',
        actionLabel: 'Fix Sync'
      }
    ]

    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.read).length)
  }, [])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'success':
        return <CheckIcon className="h-5 w-5 text-green-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const removeNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      return `${days}d ago`
    }
  }

  return (
    <>
      {/* Notification Bell Button */}
      <div className={`relative ${className}`}>
        <TouchFriendlyButton
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative p-2"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <BellIcon className="h-6 w-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </TouchFriendlyButton>
      </div>

      {/* Notification Modal */}
      <ResponsiveModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        size="lg"
      >
        <ModalContent>
          <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Notifications
              </h3>
              {unreadCount > 0 && (
                <TouchFriendlyButton
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </TouchFriendlyButton>
              )}
            </div>

            {/* Notifications List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200' 
                        : getNotificationBgColor(notification.type)
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              notification.read ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              notification.read ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                          </div>
                          
                          <TouchFriendlyButton
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNotification(notification.id)}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                            aria-label="Dismiss notification"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </TouchFriendlyButton>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 mt-3">
                          {notification.actionUrl && (
                            <TouchFriendlyButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                markAsRead(notification.id)
                                window.location.href = notification.actionUrl!
                              }}
                              className="text-xs"
                            >
                              {notification.actionLabel || 'View'}
                            </TouchFriendlyButton>
                          )}
                          
                          {!notification.read && (
                            <TouchFriendlyButton
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Mark as read
                            </TouchFriendlyButton>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t pt-4">
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-gray-600 hover:text-gray-800"
              >
                Close
              </TouchFriendlyButton>
            </div>
          </div>
        </ModalContent>
      </ResponsiveModal>
    </>
  )
}

export default NotificationCenter