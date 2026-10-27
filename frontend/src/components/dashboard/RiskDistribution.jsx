import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RISK_CATEGORY_COLORS } from '../../lib/constants';
import { CHART_THEME } from '../../utils/chartHelpers';

export function RiskDistribution({
  lowCount = 0,
  mediumCount = 0,
  highCount = 0,
  criticalCount = 0,
  className = '',
}) {
  const total = lowCount + mediumCount + highCount + criticalCount;

  const data = [
    { name: 'LOW', value: lowCount, color: RISK_CATEGORY_COLORS.LOW.hex },
    { name: 'MEDIUM', value: mediumCount, color: RISK_CATEGORY_COLORS.MEDIUM.hex },
    { name: 'HIGH', value: highCount, color: RISK_CATEGORY_COLORS.HIGH.hex },
    { name: 'CRITICAL', value: criticalCount, color: RISK_CATEGORY_COLORS.CRITICAL.hex },
  ].filter((item) => item.value > 0);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-card flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Fleet Risk Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Operational maintenance priority by turbine</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {total} Evaluated
        </span>
      </div>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400">
          No fleet risk data available
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-2">
          {/* Donut Chart */}
          <div className="w-44 h-44 shrink-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                      return (
                        <div style={CHART_THEME.tooltipStyle}>
                          <span className="font-semibold text-xs text-slate-900 block">{item.name} Priority</span>
                          <span className="text-xs text-slate-500">{item.value} Turbines ({pct}%)</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-900">{total}</span>
              <span className="text-[10px] text-slate-600 uppercase font-semibold">Total</span>
            </div>
          </div>

          {/* Legend and Percentage breakdown */}
          <div className="flex-1 w-full space-y-2.5">
            {[
              { label: 'LOW', count: lowCount, color: RISK_CATEGORY_COLORS.LOW },
              { label: 'MEDIUM', count: mediumCount, color: RISK_CATEGORY_COLORS.MEDIUM },
              { label: 'HIGH', count: highCount, color: RISK_CATEGORY_COLORS.HIGH },
              { label: 'CRITICAL', count: criticalCount, color: RISK_CATEGORY_COLORS.CRITICAL },
            ].map((cat) => {
              const pct = total > 0 ? ((cat.count / total) * 100).toFixed(1) : '0.0';
              return (
                <div key={cat.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.color.dot}`} />
                    <span className="font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{cat.count}</span>
                    <span className="text-slate-400 font-mono text-[11px] w-12 text-right">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskDistribution;
