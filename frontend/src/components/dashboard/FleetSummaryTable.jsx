import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Wind } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatHealth, formatRisk } from '../../utils/formatters';
import { COMPONENT_NAMES } from '../../lib/constants';

export function FleetSummaryTable({ turbines = [], className = '' }) {
  const navigate = useNavigate();

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Fleet Status Overview</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time health index and degraded components</p>
        </div>
        <Link
          to="/fleet"
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
        >
          <span>View Fleet</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {turbines.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Wind className="w-6 h-6 text-slate-400" />
            <p className="font-medium text-slate-700">No turbine data available</p>
            <p className="text-slate-400">Run an analysis on an uploaded dataset to populate fleet health.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Turbine</th>
                <th className="py-3 px-4">Farm</th>
                <th className="py-3 px-4">Health Index</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Dominant Component</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {turbines.slice(0, 6).map((turbine) => (
                <tr
                  key={turbine.id || turbine.turbine_id}
                  onClick={() => navigate(`/turbines/${turbine.turbine_id}`)}
                  className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {turbine.name || turbine.turbine_id}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{turbine.farm || '—'}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {formatHealth(turbine.latest_health)} / 100
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {formatRisk(turbine.latest_risk)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={turbine.latest_risk_category || 'LOW'} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {COMPONENT_NAMES[turbine.dominant_component] || turbine.dominant_component || 'Normal'}
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

export default FleetSummaryTable;
