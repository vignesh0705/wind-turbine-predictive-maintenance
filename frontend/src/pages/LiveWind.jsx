import React, { useState, useEffect } from 'react';
import { CloudSun, RefreshCw, Compass, MapPin } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import WeatherWidget from '../components/weather/WeatherWidget';
import { weatherService } from '../services/weatherService';

export function LiveWind() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lat, setLat] = useState('54.5');
  const [lon, setLon] = useState('9.5');

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.getCurrentWeather(Number(lat) || 54.5, Number(lon) || 9.5);
      setWeather(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Live weather data unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Live Environmental Telemetry"
        subtitle="Meteorological observations at the wind farm site for ambient situational monitoring."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Live Wind' },
        ]}
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchWeather}>
          Refresh Weather
        </Button>
      </PageHeader>

      {/* Coordinate selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <MapPin className="w-4 h-4 text-sky-600" />
          <span>Site Meteorological Coordinates:</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span>Lat:</span>
            <input
              type="number"
              step="0.1"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span>Lon:</span>
            <input
              type="number"
              step="0.1"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchWeather}>
            Update
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchWeather} />}

      {loading ? (
        <Loading message="Fetching live meteorological data..." />
      ) : (
        <WeatherWidget weather={weather} />
      )}
    </div>
  );
}

export default LiveWind;
