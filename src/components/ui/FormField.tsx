'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  validate?: (value: string) => string | undefined;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({
    label,
    error,
    helperText,
    required,
    showPasswordToggle,
    validate,
    validateOnChange = false,
    validateOnBlur = true,
    type = 'text',
    className = '',
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalError, setInternalError] = useState<string | undefined>();
    const [touched, setTouched] = useState(false);

    const displayError = error || internalError;
    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password') 
      : type;

    const handleValidation = (value: string) => {
      if (validate) {
        const validationError = validate(value);
        setInternalError(validationError);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (validateOnChange && touched) {
        handleValidation(e.target.value);
      }
      props.onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (validateOnBlur) {
        handleValidation(e.target.value);
      }
      props.onBlur?.(e);
    };

    // Clear internal error when external error changes
    useEffect(() => {
      if (error) {
        setInternalError(undefined);
      }
    }, [error]);

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
              ${displayError 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              ${showPasswordToggle ? 'pr-10' : ''}
              ${className}
            `}
            aria-invalid={!!displayError}
            aria-describedby={
              displayError ? `${props.id}-error` : 
              helperText ? `${props.id}-helper` : undefined
            }
            {...props}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
        </div>

        {displayError && (
          <div id={`${props.id}-error`} className="flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {helperText && !displayError && (
          <p id={`${props.id}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// Textarea variant
export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validate?: (value: string) => string | undefined;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({
    label,
    error,
    helperText,
    required,
    validate,
    validateOnChange = false,
    validateOnBlur = true,
    className = '',
    ...props
  }, ref) => {
    const [internalError, setInternalError] = useState<string | undefined>();
    const [touched, setTouched] = useState(false);

    const displayError = error || internalError;

    const handleValidation = (value: string) => {
      if (validate) {
        const validationError = validate(value);
        setInternalError(validationError);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (validateOnChange && touched) {
        handleValidation(e.target.value);
      }
      props.onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTouched(true);
      if (validateOnBlur) {
        handleValidation(e.target.value);
      }
      props.onBlur?.(e);
    };

    useEffect(() => {
      if (error) {
        setInternalError(undefined);
      }
    }, [error]);

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
            ${displayError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${className}
          `}
          aria-invalid={!!displayError}
          aria-describedby={
            displayError ? `${props.id}-error` : 
            helperText ? `${props.id}-helper` : undefined
          }
          {...props}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        {displayError && (
          <div id={`${props.id}-error`} className="flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {helperText && !displayError && (
          <p id={`${props.id}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Common validation functions
export const validators = {
  required: (message = 'This field is required') => (value: string) => {
    return value.trim() ? undefined : message;
  },
  
  email: (message = 'Please enter a valid email address') => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? undefined : message;
  },
  
  minLength: (min: number, message?: string) => (value: string) => {
    return value.length >= min ? undefined : message || `Must be at least ${min} characters`;
  },
  
  maxLength: (max: number, message?: string) => (value: string) => {
    return value.length <= max ? undefined : message || `Must be no more than ${max} characters`;
  },
  
  pattern: (regex: RegExp, message: string) => (value: string) => {
    return regex.test(value) ? undefined : message;
  },
  
  url: (message = 'Please enter a valid URL') => (value: string) => {
    try {
      new URL(value);
      return undefined;
    } catch {
      return message;
    }
  },
  
  combine: (...validators: Array<(value: string) => string | undefined>) => (value: string) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  },
};