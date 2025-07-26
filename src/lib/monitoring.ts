// Production monitoring and logging utilities

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  tenantId?: string
  requestId?: string
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
    this.logLevel = LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error, userId, tenantId, requestId } = entry
    
    const logData = {
      level: LogLevel[level],
      message,
      timestamp,
      ...(context && { context }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      ...(userId && { userId }),
      ...(tenantId && { tenantId }),
      ...(requestId && { requestId })
    }

    return JSON.stringify(logData)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    }

    const formattedLog = this.formatLog(entry)

    // In production, you might want to send logs to a service like DataDog, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service
      this.sendToExternalService(formattedLog)
    } else {
      // Console logging for development
      console.log(formattedLog)
    }
  }

  private async sendToExternalService(logData: string) {
    // Implement external logging service integration here
    // Examples: DataDog, LogRocket, Sentry, etc.
    
    try {
      // Example implementation (replace with actual service)
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`
          },
          body: logData
        })
      }
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error)
      console.log(logData)
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context)
  }
}

// Singleton logger instance
export const logger = new Logger()

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static startTimer(operation: string): () => void {
    const startTime = Date.now()
    
    return () => {
      const duration = Date.now() - startTime
      this.recordMetric(operation, duration)
    }
  }

  static recordMetric(operation: string, value: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    
    const values = this.metrics.get(operation)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
    
    // Log slow operations
    if (value > 1000) { // More than 1 second
      logger.warn(`Slow operation detected: ${operation}`, {
        duration: `${value}ms`,
        operation
      })
    }
  }

  static getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [operation, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[operation] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        }
      }
    }
    
    return result
  }

  static clearMetrics() {
    this.metrics.clear()
  }
}

// Error tracking
export class ErrorTracker {
  static track(error: Error, context?: Record<string, any>) {
    logger.error('Application error', error, context)
    
    // In production, send to error tracking service like Sentry
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { extra: context })
    }
  }

  static trackApiError(error: Error, request: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: any
  }) {
    this.track(error, {
      type: 'api_error',
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers?.['user-agent'],
        // Don't log sensitive headers or body data
      }
    })
  }
}

// Database query monitoring
export function withQueryMonitoring<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const endTimer = PerformanceMonitor.startTimer(`db_${operation}`)
  
  return queryFn()
    .then(result => {
      endTimer()
      return result
    })
    .catch(error => {
      endTimer()
      ErrorTracker.track(error, { operation, type: 'database_error' })
      throw error
    })
}

// API endpoint monitoring middleware
export function withApiMonitoring(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now()
    const operation = `api_${req.method}_${new URL(req.url).pathname}`
    
    try {
      const response = await handler(req)
      
      const duration = Date.now() - startTime
      PerformanceMonitor.recordMetric(operation, duration)
      
      logger.info(`API request completed`, {
        method: req.method,
        url: req.url,
        status: response.status,
        duration: `${duration}ms`
      })
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      PerformanceMonitor.recordMetric(operation, duration)
      
      ErrorTracker.trackApiError(error as Error, {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries())
      })
      
      throw error
    }
  }
}