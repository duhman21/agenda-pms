'use client';

import { useState, useCallback, useEffect } from 'react';
import { useErrorHandler } from '@/components/layout/ErrorHandling';
import { isAPIError, ErrorCodes } from '@/lib/api-client';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface FormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showToastOnError?: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule>,
  options: FormValidationOptions = {}
) {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    showToastOnError = true,
  } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleError } = useErrorHandler();

  const validateField = useCallback((name: keyof T, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rules.message || 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    if (typeof value === 'string') {
      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        return rules.message || `Must be at least ${rules.minLength} characters`;
      }

      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        return rules.message || `Must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return rules.message || 'Invalid format';
      }

      // Email validation
      if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return rules.message || 'Please enter a valid email address';
        }
      }

      // URL validation
      if (rules.url) {
        try {
          new URL(value);
        } catch {
          return rules.message || 'Please enter a valid URL';
        }
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [validationRules]);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    for (const name in validationRules) {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name as string] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (validateOnChange && touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name as string]: error || '',
      }));
    }
  }, [validateField, validateOnChange, touched]);

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({
        ...prev,
        [name as string]: error || '',
      }));
    }
  }, [validateField, validateOnBlur, values]);

  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => Promise<void>,
    onError?: (error: unknown) => void
  ) => {
    setIsSubmitting(true);
    
    try {
      const isValid = validateForm();
      if (!isValid) {
        if (showToastOnError) {
          handleError(new Error('Please fix the validation errors'), { showToast: true });
        }
        return;
      }

      await onSubmit(values);
    } catch (error) {
      // Handle API validation errors
      if (isAPIError(error) && error.code === ErrorCodes.VALIDATION_ERROR && error.details) {
        if (typeof error.details === 'object') {
          const serverErrors: ValidationErrors = {};
          Object.entries(error.details).forEach(([field, message]) => {
            if (typeof message === 'string') {
              serverErrors[field] = message;
            }
          });
          setErrors(prev => ({ ...prev, ...serverErrors }));
        }
      }

      if (onError) {
        onError(error);
      } else if (showToastOnError) {
        handleError(error, { showToast: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, handleError, showToastOnError]);

  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setTouched({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
  }, [initialValues]);

  // Update values when initialValues change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    handleBlur,
    handleSubmit,
    validateForm,
    validateField,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// Predefined validation rules
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required',
  }),

  email: (message?: string): ValidationRule => ({
    email: true,
    message: message || 'Please enter a valid email address',
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `Must be no more than ${max} characters`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    pattern: regex,
    message,
  }),

  url: (message?: string): ValidationRule => ({
    url: true,
    message: message || 'Please enter a valid URL',
  }),

  password: (message?: string): ValidationRule => ({
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: message || 'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),

  combine: (...rules: ValidationRule[]): ValidationRule => {
    return {
      custom: (value: any) => {
        for (const rule of rules) {
          if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            return rule.message || 'This field is required';
          }
          
          if (value && typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
              return rule.message || `Must be at least ${rule.minLength} characters`;
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              return rule.message || `Must be no more than ${rule.maxLength} characters`;
            }
            if (rule.pattern && !rule.pattern.test(value)) {
              return rule.message || 'Invalid format';
            }
            if (rule.email) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                return rule.message || 'Please enter a valid email address';
              }
            }
            if (rule.url) {
              try {
                new URL(value);
              } catch {
                return rule.message || 'Please enter a valid URL';
              }
            }
          }
          
          if (rule.custom) {
            const customError = rule.custom(value);
            if (customError) return customError;
          }
        }
        return null;
      },
    };
  },
};