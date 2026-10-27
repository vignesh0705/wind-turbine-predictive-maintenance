import React from 'react';
import { Wind, Compass, Thermometer, Droplets, Gauge, CloudSun, Clock } from 'lucide-react';
import { formatDateTime, formatNumber } from '../../utils/formatters';

export function WeatherWidget({ weather, className = '' }) {
  if (!weather) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
        Live weather data currently unavailable
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{weather.location_name || 'Wind Farm Site'}</h3>
            <p className="text-xs text-slate-500">Live environmental atmospheric telemetry (external monitoring)</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-center">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Updated: {formatDateTime(weather.timestamp)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* Wind Speed */}
        <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-1">
          <div className="flex items-center space-x-1.5 text-sky-700 text-xs font-semibold">
            <Wind className="w-4 h-4" />
            <span>Wind Speed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatNumber(weather.wind_speed_ms, 1)} <span className="text-xs text-slate-500 font-normal">m/s</span>
          </p>
          <span className="text-[10px] text-slate-500 block">At 10m elevation</span>
        </div>

        {/* Wind Direction */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-semibold">
            <Compass className="w-4 h-4 text-sky-600" />
            <span>Direction</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatNumber(weather.wind_direction_deg, 0)}°
          </p>
          <span className="text-[10px] text-slate-500 block">Bearing angle</span>
        </div>

        {/* Temperature */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-semibold">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <span>Ambient Temp</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatNumber(weather.temperature_celsius, 1)}°C
          </p>
          <span className="text-[10px] text-slate-500 block">Atmospheric</span>
        </div>

        {/* Humidity */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-semibold">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>Humidity</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatNumber(weather.relative_humidity, 0)}%
          </p>
          <span className="text-[10px] text-slate-500 block">Relative density</span>
        </div>

        {/* Surface Pressure */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-semibold">
            <Gauge className="w-4 h-4 text-slate-600" />
            <span>Pressure</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatNumber(weather.surface_pressure_hpa, 0)}{' '}
            <span className="text-xs text-slate-500 font-normal">hPa</span>
          </p>
          <span className="text-[10px] text-slate-500 block">Barometric</span>
        </div>
      </div>

      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
        <span>Operational Note: Atmospheric weather telemetry is displayed strictly for site situational awareness.</span>
        <span className="font-semibold text-amber-800">Isolated from SCADA ML inputs</span>
      </div>
    </div>
  );
}

export default WeatherWidget;
