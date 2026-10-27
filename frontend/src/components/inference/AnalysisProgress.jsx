import React from 'react';
import StatusBadge from '../common/StatusBadge';
import Spinner from '../common/Spinner';

export function AnalysisProgress({ status, progress = 0, totalRows = 0 }) {
  const isRunning = status === 'processing' || status === 'queued';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isRunning && <Spinner size="md" className="text-sky-600" />}
          <div>
            <h4 className="text-base font-bold text-slate-900">
              {status === 'completed'
                ? 'AI Diagnostic Analysis Completed'
                : status === 'failed'
                ? 'Analysis Encountered an Error'
                : 'Processing SCADA Sensor Signals...'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluating XGBoost regression, Autoencoder reconstruction, and Isolation Forest anomalies
            </p>
          </div>
        </div>
        <StatusBadge status={status || 'QUEUED'} size="md" />
      </div>

      <div className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Analysis Progress</span>
          <span className="font-mono text-sky-600">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'completed'
                ? 'bg-emerald-600'
                : status === 'failed'
                ? 'bg-red-600'
                : 'bg-sky-600'
            }`}
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        {totalRows > 0 && (
          <p className="text-[11px] text-slate-600 text-right">
            Evaluating {totalRows.toLocaleString()} SCADA measurement records
          </p>
        )}
      </div>
    </div>
  );
}

export default AnalysisProgress;
