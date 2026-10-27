import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CHART_THEME } from '../../utils/chartHelpers';
import { formatNumber } from '../../utils/formatters';

export function FeatureImportanceChart({ features = [], source = 'xgboost_native_gain' }) {
  if (!features || features.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No feature importance data available
      </div>
    );
  }

  // Top 10 features for readable chart
  const topFeatures = [...features].slice(0, 10).reverse();

  return (
    <div className="space-y-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={topFeatures}
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} horizontal={false} />
            <XAxis
              type="number"
              stroke={CHART_THEME.colors.text}
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="feature"
              stroke={CHART_THEME.colors.text}
              fontSize={11}
              tickLine={false}
              width={90}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={CHART_THEME.tooltipStyle}>
                      <span className="font-semibold text-xs text-slate-900 block font-mono">{data.feature}</span>
                      <span className="text-xs text-slate-500">Importance: {formatNumber(data.importance, 5)}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {topFeatures.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={index % 2 === 0 ? '#0284C7' : '#0EA5E9'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 px-1">
        <span>Attribution metric: <strong>{source}</strong></span>
        <span>Showing top 10 most influential features</span>
      </div>
    </div>
  );
}

export default FeatureImportanceChart;
