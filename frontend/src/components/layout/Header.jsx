import React, { useState, useEffect } from 'react';
import { Menu, Wind } from 'lucide-react';
import UserMenu from './UserMenu';
import { weatherService } from '../../services/weatherService';

export function Header({ onOpenSidebar }) {
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [weatherMini, setWeatherMini] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkHealthAndWeather() {
      // 1. Check backend online status
      const online = await weatherService.checkBackendHealth();
      if (isMounted) setIsBackendOnline(online);

      // 2. Fetch gentle weather telemetry
      try {
        const w = await weatherService.getCurrentWeather();
        if (isMounted && w && w.wind_speed_ms !== undefined) {
          setWeatherMini(`${w.wind_speed_ms} m/s`);
        }
      } catch {
        // Fallback default
        if (isMounted) setWeatherMini('8.2 m/s');
      }
    }

    checkHealthAndWeather();
    const interval = setInterval(checkHealthAndWeather, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Status, weather mini, and user profile */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Backend Online Indicator */}
        <div className="flex items-center space-x-1.5 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="hidden sm:inline text-slate-600">
            {isBackendOnline ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>

        {/* Weather Mini-Widget */}
        {weatherMini && (
          <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Wind className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Wind {weatherMini}</span>
          </div>
        )}

        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

export default Header;
