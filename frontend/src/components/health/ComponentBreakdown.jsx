import React from 'react';
import { COMPONENT_NAMES } from '../../lib/constants';
import { formatPercentage } from '../../utils/formatters';

export function ComponentBreakdown({ components = {}, dominantComponent = '', className = '' }) {
  const entries = Object.entries(components);

  const getBarColor = (val, isDominant) => {
    if (isDominant) return 'bg-red-500';
    if (val > 50) return 'bg-orange-500';
    if (val > 25) return 'bg-amber-500';
    return 'bg-sky-500';
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Subsystem Degradation Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">Component-level telemetry reconstruction errors</p>
        </div>
        {dominantComponent && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            Dominant: {COMPONENT_NAMES[dominantComponent] || dominantComponent}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-slate-400">
          No component degradation data available for this selection
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(([compKey, value]) => {
            const isDominant = compKey === dominantComponent;
            const pct = Math.min(100, Math.max(0, Number(value) || 0));
            const colorClass = getBarColor(pct, isDominant);

            return (
              <div key={compKey} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isDominant ? 'text-red-900 font-bold' : 'text-slate-700'}`}>
                    {COMPONENT_NAMES[compKey] || compKey}
                    {isDominant && ' ★ (Primary Degradation)'}
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatPercentage(pct)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ComponentBreakdown;
