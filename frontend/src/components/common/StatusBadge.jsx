import React from 'react';
import Badge from './Badge';

export function StatusBadge({ status, size = 'md', className = '' }) {
  if (!status) return null;

  const upper = String(status).toUpperCase();

  switch (upper) {
    case 'LOW':
    case 'HEALTHY':
    case 'COMPLETED':
    case 'READY':
    case 'ONLINE':
      return (
        <Badge variant="success" size={size} dot className={className}>
          {status}
        </Badge>
      );
    case 'MEDIUM':
    case 'PROCESSING':
    case 'WARNING':
    case 'QUEUED':
      return (
        <Badge variant="warning" size={size} dot className={className}>
          {status}
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge variant="warning" size={size} dot className={`border-orange-300 text-orange-800 bg-orange-50 ${className}`}>
          {status}
        </Badge>
      );
    case 'CRITICAL':
    case 'FAILED':
    case 'ERROR':
    case 'OFFLINE':
      return (
        <Badge variant="danger" size={size} dot className={className}>
          {status}
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size} dot className={className}>
          {status}
        </Badge>
      );
  }
}

export default StatusBadge;
