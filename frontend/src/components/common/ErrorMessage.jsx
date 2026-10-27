import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`p-6 bg-red-50/70 border border-red-200 rounded-xl text-red-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start space-x-3.5">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm text-red-900">{title}</h4>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            {message || 'An unexpected error occurred. Please verify your connection or try again.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="bg-white border-red-200 text-red-700 hover:bg-red-50 shrink-0 self-start sm:self-center"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

export default ErrorMessage;
