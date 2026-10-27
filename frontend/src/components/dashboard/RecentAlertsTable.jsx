import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime, formatRisk } from '../../utils/formatters';
import { COMPONENT_NAMES } from '../../lib/constants';

export function RecentAlertsTable({ alerts = [], className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent Diagnostic Alerts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Turbines exhibiting elevated operational risk</p>
        </div>
        <Link
          to="/alerts"
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <p className="font-medium text-slate-700">No active alerts</p>
            <p className="text-slate-400">All turbines are operating within nominal thresholds.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Turbine</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {alerts.slice(0, 5).map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.severity} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <Link to={`/turbines/${alert.asset_id}`} className="hover:text-sky-600 transition-colors">
                      {alert.asset_id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {COMPONENT_NAMES[alert.component] || alert.component || 'System'}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {formatRisk(alert.risk_score)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 text-[11px]">
                    {formatDateTime(alert.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RecentAlertsTable;
