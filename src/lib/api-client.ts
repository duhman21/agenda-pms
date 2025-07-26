export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  status: number;
}

export enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TENANT_ISOLATION_VIOLATION = 'TENANT_ISOLATION_VIOLATION',
  ICAL_SYNC_FAILED = 'ICAL_SYNC_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class APIClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(error: APIError) {
    super(error.message);
    this.name = 'APIClientError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
    this.timestamp = error.timestamp;
  }
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      let errorData: APIError;

      if (isJSON) {
        try {
          errorData = await response.json();
        } catch {
          errorData = this.createGenericError(response);
        }
      } else {
        errorData = this.createGenericError(response);
      }

      throw new APIClientError(errorData);
    }

    if (isJSON) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  private createGenericError(response: Response): APIError {
    const getErrorCode = (status: number): string => {
      switch (status) {
        case 401:
          return ErrorCodes.UNAUTHORIZED;
        case 403:
          return ErrorCodes.FORBIDDEN;
        case 404:
          return ErrorCodes.NOT_FOUND;
        case 429:
          return ErrorCodes.RATE_LIMITED;
        case 500:
          return ErrorCodes.INTERNAL_SERVER_ERROR;
        default:
          return ErrorCodes.INTERNAL_SERVER_ERROR;
      }
    };

    return {
      code: getErrorCode(response.status),
      message: response.statusText || 'An unexpected error occurred',
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof APIClientError) {
        throw error;
      }

      // Network or other fetch errors
      throw new APIClientError({
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Network error occurred. Please check your connection.',
        status: 0,
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown network error',
      });
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new APIClient();

// Helper function to check if an error is an API error
export function isAPIError(error: unknown): error is APIClientError {
  return error instanceof APIClientError;
}

// Helper function to get user-friendly error messages
export function getErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    switch (error.code) {
      case ErrorCodes.UNAUTHORIZED:
        return 'Please log in to continue.';
      case ErrorCodes.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCodes.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCodes.VALIDATION_ERROR:
        return error.message || 'Please check your input and try again.';
      case ErrorCodes.TENANT_ISOLATION_VIOLATION:
        return 'Access denied. Please contact your administrator.';
      case ErrorCodes.ICAL_SYNC_FAILED:
        return 'Calendar sync failed. Please check your iCal URL and try again.';
      case ErrorCodes.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCodes.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}