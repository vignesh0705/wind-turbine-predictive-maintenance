import React from 'react';
import Spinner from './Spinner';

export function Loading({ message = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
        <Spinner size="xl" className="text-sky-600" />
        <p className="text-slate-600 text-sm font-medium animate-pulse">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Spinner size="lg" className="text-sky-600" />
      <p className="text-slate-500 text-sm font-medium">{message}</p>
    </div>
  );
}

export default Loading;
