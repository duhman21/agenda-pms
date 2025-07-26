import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

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
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  status: number;
  path?: string;
  method?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
    status: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCodes.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorCodes.FORBIDDEN, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ErrorCodes.NOT_FOUND, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.CONFLICT, 409, details);
  }
}

export class TenantIsolationError extends AppError {
  constructor(message: string = 'Tenant isolation violation') {
    super(message, ErrorCodes.TENANT_ISOLATION_VIOLATION, 403);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.DATABASE_ERROR, 500, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorCodes.RATE_LIMITED, 429);
  }
}

export class ICalSyncError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.ICAL_SYNC_FAILED, 500, details);
  }
}

// Error response formatter
export function formatErrorResponse(
  error: unknown,
  request?: NextRequest
): APIError {
  const timestamp = new Date().toISOString();
  const path = request?.nextUrl?.pathname;
  const method = request?.method;

  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      status: error.status,
      timestamp,
      path,
      method,
    };
  }

  if (error instanceof ZodError) {
    const validationDetails: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      validationDetails[path] = err.message;
    });

    return {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: validationDetails,
      status: 400,
      timestamp,
      path,
      method,
    };
  }

  // Database constraint errors
  if (error instanceof Error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return {
        code: ErrorCodes.CONFLICT,
        message: 'Resource already exists',
        status: 409,
        timestamp,
        path,
        method,
      };
    }

    if (error.message.includes('foreign key constraint')) {
      return {
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid reference to related resource',
        status: 400,
        timestamp,
        path,
        method,
      };
    }

    if (error.message.includes('not null constraint')) {
      return {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Required field is missing',
        status: 400,
        timestamp,
        path,
        method,
      };
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return {
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    status: 500,
    timestamp,
    path,
    method,
    details: process.env.NODE_ENV === 'development' ? {
      stack: error instanceof Error ? error.stack : undefined,
      originalError: String(error),
    } : undefined,
  };
}

// Global error handler for API routes
export function handleAPIError(
  error: unknown,
  request?: NextRequest
): NextResponse<APIError> {
  const errorResponse = formatErrorResponse(error, request);

  // Log error for monitoring
  console.error('API Error:', {
    ...errorResponse,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // In production, you might want to send this to an error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorResponse });
  }

  return NextResponse.json(errorResponse, { status: errorResponse.status });
}

// Async error wrapper for API route handlers
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<APIError>> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined;
      return handleAPIError(error, request);
    }
  };
}

// Middleware for consistent error handling
export function errorHandlingMiddleware(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleAPIError(error, request);
    }
  };
}

// Database error handler
export function handleDatabaseError(error: unknown): never {
  // Handle PostgreSQL error objects
  const pgError = error as any;
  
  if (pgError && pgError.code) {
    switch (pgError.code) {
      case '23505': // unique_violation
        throw new ConflictError('Resource already exists', {
          constraint: pgError.constraint,
          detail: pgError.detail,
        });
      
      case '23503': // foreign_key_violation
        throw new ValidationError('Invalid reference to related resource', {
          constraint: pgError.constraint,
          detail: pgError.detail,
        });
      
      case '23502': // not_null_violation
        throw new ValidationError('Required field is missing', {
          column: pgError.column,
          table: pgError.table,
        });
      
      case '23514': // check_violation
        throw new ValidationError('Data validation failed', {
          constraint: pgError.constraint,
          detail: pgError.detail,
        });
      
      case '42P01': // undefined_table
        throw new DatabaseError('Database schema error', {
          detail: pgError.message,
        });
      
      default:
        throw new DatabaseError('Database operation failed', {
          code: pgError.code,
          detail: pgError.message,
        });
    }
  }

  if (error instanceof Error) {
    throw new DatabaseError('Database operation failed', {
      detail: error.message,
    });
  }

  throw new DatabaseError('Unknown database error');
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): void {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (record.count >= limit) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`);
  }

  record.count++;
}

// Tenant isolation validator
export function validateTenantAccess(
  userTenantId: string | null | undefined,
  resourceTenantId: string | null | undefined
): void {
  if (!userTenantId) {
    throw new UnauthorizedError('User tenant information is missing');
  }

  if (!resourceTenantId) {
    throw new TenantIsolationError('Resource tenant information is missing');
  }

  if (userTenantId !== resourceTenantId) {
    throw new TenantIsolationError('Access denied: tenant isolation violation');
  }
}