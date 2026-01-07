'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input, type InputProps } from './input';

export interface FormFieldProps extends InputProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id,
      label,
      description,
      error,
      required,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const fieldId = id || generatedId;
    const descriptionId = `${fieldId}-description`;
    const errorId = `${fieldId}-error`;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label htmlFor={fieldId} {...(required !== undefined && { required })}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={fieldId}
          aria-describedby={
            cn(description && descriptionId, error && errorId) || undefined
          }
          aria-invalid={!!error}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />
        {description && !error && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export { FormField };
