import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { formatPercentage, formatNumber } from '../../utils/formatters';

export function QualityIndicator({ quality }) {
  if (!quality) return null;

  const missingPct = quality.missing_percentage || 0;
  const dupPct = quality.duplicate_percentage || 0;

  const getStatus = (pct) => {
    if (pct === 0) return { label: 'Optimal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct < 5) return { label: 'Good', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (pct < 15) return { label: 'Warning', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200' };
  };

  const missingStatus = getStatus(missingPct);
  const dupStatus = getStatus(dupPct);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Data Completeness</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${missingStatus.color}`}>
            {missingStatus.label}
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatPercentage(100 - missingPct)}</p>
        <p className="text-xs text-slate-500 mt-1">
          {formatNumber(quality.missing_cells, 0)} null cells ({formatPercentage(missingPct)})
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Duplicate Records</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dupStatus.color}`}>
            {dupStatus.label}
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatNumber(quality.duplicate_rows, 0)}</p>
        <p className="text-xs text-slate-500 mt-1">{formatPercentage(dupPct)} duplication rate</p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Data Cells</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Telemetry
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatNumber(quality.total_cells, 0)}</p>
        <p className="text-xs text-slate-500 mt-1">Evaluated across all sensor columns</p>
      </div>
    </div>
  );
}

export default QualityIndicator;
