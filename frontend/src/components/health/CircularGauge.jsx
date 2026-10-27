import React from 'react';
import { formatNumber } from '../../utils/formatters';

export function CircularGauge({
  value = 0,
  max = 100,
  title = 'Health Index',
  subtitle,
  type = 'health', // 'health' or 'risk'
  size = 180,
  className = '',
}) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const validVal = Math.min(max, Math.max(0, Number(value) || 0));
  const strokeDashoffset = circumference - (validVal / max) * circumference;

  // Determine stroke color
  let strokeColor = '#16A34A'; // Green for high health
  if (type === 'health') {
    if (validVal < 50) strokeColor = '#DC2626'; // Danger
    else if (validVal < 75) strokeColor = '#F59E0B'; // Warning
  } else {
    // Risk score: Higher is more critical
    if (validVal >= 75) strokeColor = '#DC2626';
    else if (validVal >= 50) strokeColor = '#EA580C';
    else if (validVal >= 25) strokeColor = '#F59E0B';
    else strokeColor = '#16A34A';
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-card flex flex-col items-center justify-center text-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated active progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatNumber(validVal, 1)}
          </span>
          <span className="text-[11px] text-slate-600 font-semibold tracking-wide uppercase mt-0.5">
            / {max}
          </span>
        </div>
      </div>

      <h4 className="text-base font-bold text-slate-900 mt-4">{title}</h4>
      {subtitle && <p className="text-xs text-slate-600 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

export default CircularGauge;
