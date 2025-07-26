import { NextRequest, NextResponse } from 'next/server';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TenantIsolationError,
  DatabaseError,
  RateLimitError,
  ICalSyncError,
  formatErrorResponse,
  handleAPIError,
  withErrorHandling,
  handleDatabaseError,
  checkRateLimit,
  validateTenantAccess,
  ErrorCodes,
} from '../api-error-handler';
import { ZodError } from 'zod';

describe('API Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test message', ErrorCodes.BAD_REQUEST, 400, { detail: 'test' });
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(ErrorCodes.BAD_REQUEST);
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Validation failed', { field: 'name' });
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: 'name' });
    });

    it('should create UnauthorizedError with correct defaults', () => {
      const error = new UnauthorizedError();
      
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should create ForbiddenError with correct defaults', () => {
      const error = new ForbiddenError();
      
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(error.status).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError();
      
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create ConflictError with correct defaults', () => {
      const error = new ConflictError('Resource exists', { id: '123' });
      
      expect(error.code).toBe(ErrorCodes.CONFLICT);
      expect(error.status).toBe(409);
      expect(error.details).toEqual({ id: '123' });
    });

    it('should create TenantIsolationError with correct defaults', () => {
      const error = new TenantIsolationError();
      
      expect(error.code).toBe(ErrorCodes.TENANT_ISOLATION_VIOLATION);
      expect(error.status).toBe(403);
      expect(error.message).toBe('Tenant isolation violation');
    });

    it('should create DatabaseError with correct defaults', () => {
      const error = new DatabaseError('DB failed', { query: 'SELECT *' });
      
      expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
      expect(error.status).toBe(500);
      expect(error.details).toEqual({ query: 'SELECT *' });
    });

    it('should create RateLimitError with correct defaults', () => {
      const error = new RateLimitError();
      
      expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(error.status).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create ICalSyncError with correct defaults', () => {
      const error = new ICalSyncError('Sync failed', { url: 'http://example.com' });
      
      expect(error.code).toBe(ErrorCodes.ICAL_SYNC_FAILED);
      expect(error.status).toBe(500);
      expect(error.details).toEqual({ url: 'http://example.com' });
    });
  });

  describe('formatErrorResponse', () => {
    const mockRequest = {
      nextUrl: { pathname: '/api/test' },
      method: 'POST',
    } as NextRequest;

    it('should format AppError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'name' });
      const response = formatErrorResponse(error, mockRequest);

      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.message).toBe('Invalid input');
      expect(response.status).toBe(400);
      expect(response.details).toEqual({ field: 'name' });
      expect(response.path).toBe('/api/test');
      expect(response.method).toBe('POST');
      expect(response.timestamp).toBeDefined();
    });

    it('should format ZodError correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          path: ['email'],
          message: 'String must contain at least 1 character(s)',
        },
      ]);

      const response = formatErrorResponse(zodError, mockRequest);

      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.message).toBe('Validation failed');
      expect(response.status).toBe(400);
      expect(response.details).toEqual({
        name: 'Expected string, received number',
        email: 'String must contain at least 1 character(s)',
      });
    });

    it('should handle database constraint errors', () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      const response = formatErrorResponse(dbError, mockRequest);

      expect(response.code).toBe(ErrorCodes.CONFLICT);
      expect(response.message).toBe('Resource already exists');
      expect(response.status).toBe(409);
    });

    it('should handle foreign key constraint errors', () => {
      const dbError = new Error('violates foreign key constraint');
      const response = formatErrorResponse(dbError, mockRequest);

      expect(response.code).toBe(ErrorCodes.BAD_REQUEST);
      expect(response.message).toBe('Invalid reference to related resource');
      expect(response.status).toBe(400);
    });

    it('should handle not null constraint errors', () => {
      const dbError = new Error('violates not null constraint');
      const response = formatErrorResponse(dbError, mockRequest);

      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.message).toBe('Required field is missing');
      expect(response.status).toBe(400);
    });

    it('should handle generic errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Generic error');
      const response = formatErrorResponse(error, mockRequest);

      expect(response.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(response.message).toBe('Generic error');
      expect(response.status).toBe(500);
      expect(response.details).toBeDefined();
      expect(response.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle generic errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Generic error');
      const response = formatErrorResponse(error, mockRequest);

      expect(response.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(response.message).toBe('Internal server error');
      expect(response.status).toBe(500);
      expect(response.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handleAPIError', () => {
    const mockRequest = {
      nextUrl: { pathname: '/api/test' },
      method: 'POST',
    } as NextRequest;

    it('should return NextResponse with error details', () => {
      const error = new ValidationError('Invalid input');
      const response = handleAPIError(error, mockRequest);

      expect(response.status).toBe(400);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful execution', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withErrorHandling(handler);

      const result = await wrappedHandler('arg1', 'arg2');

      expect(result).toBe('success');
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle errors and return error response', async () => {
      const error = new ValidationError('Invalid input');
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandling(handler);

      const mockRequest = {
        nextUrl: { pathname: '/api/test' },
        method: 'POST',
      } as NextRequest;

      const result = await wrappedHandler(mockRequest);

      expect(result.status).toBe(400);
      expect(handler).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleDatabaseError', () => {
    it('should throw ConflictError for unique violation', () => {
      const pgError = {
        code: '23505',
        constraint: 'unique_email',
        detail: 'Key (email)=(test@example.com) already exists.',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(ConflictError);
    });

    it('should throw ValidationError for foreign key violation', () => {
      const pgError = {
        code: '23503',
        constraint: 'fk_user_id',
        detail: 'Key (user_id)=(123) is not present in table "users".',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(ValidationError);
    });

    it('should throw ValidationError for not null violation', () => {
      const pgError = {
        code: '23502',
        column: 'name',
        table: 'properties',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(ValidationError);
    });

    it('should throw ValidationError for check violation', () => {
      const pgError = {
        code: '23514',
        constraint: 'check_percentage',
        detail: 'Failing row contains (150).',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(ValidationError);
    });

    it('should throw DatabaseError for undefined table', () => {
      const pgError = {
        code: '42P01',
        message: 'relation "nonexistent_table" does not exist',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(DatabaseError);
    });

    it('should throw DatabaseError for unknown errors', () => {
      const pgError = {
        code: '99999',
        message: 'Unknown error',
      };

      expect(() => handleDatabaseError(pgError)).toThrow(DatabaseError);
    });

    it('should throw DatabaseError for non-Error objects', () => {
      expect(() => handleDatabaseError('string error')).toThrow(DatabaseError);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear the rate limit map
      const rateLimitMap = (checkRateLimit as any).__rateLimitMap;
      if (rateLimitMap) {
        rateLimitMap.clear();
      }
    });

    it('should allow requests within limit', () => {
      expect(() => checkRateLimit('user1', 5, 60000)).not.toThrow();
      expect(() => checkRateLimit('user1', 5, 60000)).not.toThrow();
      expect(() => checkRateLimit('user1', 5, 60000)).not.toThrow();
    });

    it('should throw RateLimitError when limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('user2', 5, 60000);
      }

      expect(() => checkRateLimit('user2', 5, 60000)).toThrow(RateLimitError);
    });

    it('should reset after window expires', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('user3', 5, 1000);
      }

      // Should throw when limit exceeded
      expect(() => checkRateLimit('user3', 5, 1000)).toThrow(RateLimitError);

      // Advance time past the window
      currentTime += 2000;

      // Should allow requests again
      expect(() => checkRateLimit('user3', 5, 1000)).not.toThrow();

      Date.now = originalNow;
    });
  });

  describe('validateTenantAccess', () => {
    it('should pass for matching tenant IDs', () => {
      expect(() => validateTenantAccess('tenant1', 'tenant1')).not.toThrow();
    });

    it('should throw UnauthorizedError for missing user tenant ID', () => {
      expect(() => validateTenantAccess(null, 'tenant1')).toThrow(UnauthorizedError);
      expect(() => validateTenantAccess(undefined, 'tenant1')).toThrow(UnauthorizedError);
    });

    it('should throw TenantIsolationError for missing resource tenant ID', () => {
      expect(() => validateTenantAccess('tenant1', null)).toThrow(TenantIsolationError);
      expect(() => validateTenantAccess('tenant1', undefined)).toThrow(TenantIsolationError);
    });

    it('should throw TenantIsolationError for mismatched tenant IDs', () => {
      expect(() => validateTenantAccess('tenant1', 'tenant2')).toThrow(TenantIsolationError);
    });
  });
});