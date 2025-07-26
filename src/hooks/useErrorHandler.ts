'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { APIClientError, getErrorMessage, isAPIError, ErrorCodes } from '@/lib/api-client';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  customMessage?: string;
  onError?: (error: unknown) => void;
  retryAction?: () => void;
}

export function useErrorHandler() {
  const toast = useToast();

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      customMessage,
      onError,
      retryAction,
    } = options;

    // Log error for debugging
    console.error('Error handled:', error);

    // Call custom error handler if provided
    onError?.(error);

    if (!showToast) return;

    const message = customMessage || getErrorMessage(error);
    
    if (isAPIError(error)) {
      const toastOptions = {
        action: retryAction ? {
          label: 'Retry',
          onClick: retryAction,
        } : undefined,
      };

      switch (error.code) {
        case ErrorCodes.UNAUTHORIZED:
          toast.error('Authentication Required', message, toastOptions);
          break;
        case ErrorCodes.FORBIDDEN:
          toast.error('Access Denied', message, toastOptions);
          break;
        case ErrorCodes.NOT_FOUND:
          toast.error('Not Found', message, toastOptions);
          break;
        case ErrorCodes.VALIDATION_ERROR:
          toast.warning('Validation Error', message, toastOptions);
          break;
        case ErrorCodes.TENANT_ISOLATION_VIOLATION:
          toast.error('Security Error', message);
          break;
        case ErrorCodes.ICAL_SYNC_FAILED:
          toast.error('Calendar Sync Failed', message, toastOptions);
          break;
        case ErrorCodes.RATE_LIMITED:
          toast.warning('Rate Limited', message);
          break;
        case ErrorCodes.NETWORK_ERROR:
          toast.error('Network Error', message, toastOptions);
          break;
        case ErrorCodes.DATABASE_ERROR:
          toast.error('Database Error', message, toastOptions);
          break;
        default:
          toast.error('Error', message, toastOptions);
      }
    } else {
      toast.error('Unexpected Error', message, {
        action: retryAction ? {
          label: 'Retry',
          onClick: retryAction,
        } : undefined,
      });
    }
  }, [toast]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<void>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      await asyncFn();
    } catch (error) {
      handleError(error, options);
    }
  }, [handleError]);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: ErrorHandlerOptions = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        return undefined;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    withErrorHandling,
  };
}

// Hook for form error handling
export function useFormErrorHandler() {
  const { handleError } = useErrorHandler();

  const handleFormError = useCallback((
    error: unknown,
    setFieldError?: (field: string, message: string) => void
  ) => {
    if (isAPIError(error) && error.code === ErrorCodes.VALIDATION_ERROR) {
      // Handle validation errors from the server
      if (error.details && typeof error.details === 'object' && setFieldError) {
        Object.entries(error.details).forEach(([field, message]) => {
          if (typeof message === 'string') {
            setFieldError(field, message);
          }
        });
        return;
      }
    }

    // Fall back to general error handling
    handleError(error, { showToast: true });
  }, [handleError]);

  return { handleFormError };
}