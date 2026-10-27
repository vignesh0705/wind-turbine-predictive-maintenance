import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { formatNumber, formatDateTime, formatHealth, formatRisk } from '../../utils/formatters';
import { COMPONENT_NAMES } from '../../lib/constants';

export function PredictionTable({ predictions = [], title = 'Sample Prediction Records' }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(predictions.length / pageSize) || 1;

  const currentSlice = predictions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {predictions.length} model inference sample records
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Turbine</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actual Power</th>
              <th className="py-3 px-4">Expected Power</th>
              <th className="py-3 px-4">Residual</th>
              <th className="py-3 px-4">Anomaly Score</th>
              <th className="py-3 px-4">Health Index</th>
              <th className="py-3 px-4">Risk Score</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Dominant Component</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {currentSlice.map((record, idx) => (
              <tr key={record.id || idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900">{record.asset_id}</td>
                <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                  {formatDateTime(record.timestamp)}
                </td>
                <td className="py-3 px-4 font-mono">{formatNumber(record.actual_power, 3)}</td>
                <td className="py-3 px-4 font-mono">{formatNumber(record.expected_power, 3)}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{formatNumber(record.residual, 3)}</td>
                <td className="py-3 px-4 font-mono">{formatNumber(record.anomaly_score, 3)}</td>
                <td className="py-3 px-4 font-mono font-medium text-slate-900">
                  {formatHealth(record.health_index)}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-slate-900">
                  {formatRisk(record.risk_score)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={record.risk_category} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {COMPONENT_NAMES[record.dominant_component] || record.dominant_component || 'Normal'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/40">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default PredictionTable;
