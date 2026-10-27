import React from 'react';

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  badgeText,
  badgeColor = 'text-slate-600 bg-slate-100',
  className = '',
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</span>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sky-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2.5 my-1">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</span>
        {badgeText && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>

      {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
    </div>
  );
}

export default KpiCard;
