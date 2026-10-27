import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import { formatNumber, formatHealth, formatRisk } from '../../utils/formatters';

export function AnalysisStatus({ results, onViewResults }) {
  if (!results) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Analysis Summary: {results.farm}</h3>
            <p className="text-xs text-slate-500">Inference completed using pre-trained model pipeline</p>
          </div>
        </div>
        {onViewResults && (
          <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right" onClick={onViewResults}>
            View Fleet Results
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rows Evaluated</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatNumber(results.total_rows, 0)}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Turbines Identified</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{results.total_turbines}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Health Index</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatHealth(results.average_health)} / 100</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Risk Priority</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatRisk(results.average_risk)}</p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Low: <strong>{results.low_count}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Medium: <strong>{results.medium_count}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-600">High: <strong>{results.high_count}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span className="text-slate-600">Critical: <strong>{results.critical_count}</strong></span>
          </div>
        </div>
        <div className="text-xs text-slate-600">
          Alerts Generated: <strong className="text-red-700">{results.alerts_generated}</strong>
        </div>
      </div>
    </div>
  );
}

export default AnalysisStatus;
