import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wind,
  Layers,
  Upload,
  Database,
  Zap,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  CloudSun,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function Sidebar({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  const { showInfo } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showInfo('Logged out successfully');
    navigate('/login');
  };

  const navSections = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Fleet Monitoring', path: '/fleet', icon: Wind },
      ],
    },
    {
      title: 'DATA',
      items: [
        { label: 'Upload Dataset', path: '/upload', icon: Upload },
        { label: 'Datasets', path: '/datasets', icon: Database },
      ],
    },
    {
      title: 'AI ANALYSIS',
      items: [
        { label: 'Power Performance', path: '/performance', icon: Zap },
        { label: 'Anomaly & Alerts', path: '/alerts', icon: AlertTriangle },
        { label: 'Health & Risk', path: '/health-risk', icon: HeartPulse },
        { label: 'Explainability', path: '/explainability', icon: Sparkles },
      ],
    },
    {
      title: 'ENVIRONMENT',
      items: [
        { label: 'Live Wind', path: '/live-wind', icon: CloudSun },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <NavLink to="/dashboard" className="flex items-center space-x-3 group">
          <img src="/logo.svg" alt="WindTurbine AI Logo" className="w-8 h-8 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 tracking-tight leading-tight group-hover:text-sky-600 transition-colors">
              WindTurbine<span className="text-sky-600"> AI</span>
            </span>
            <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">
              Predictive Maintenance
            </span>
          </div>
        </NavLink>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h4 className="px-3 text-[11px] font-semibold text-slate-600 tracking-wider uppercase mb-1.5">
              {section.title}
            </h4>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-sky-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Account / User Section */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="px-3 py-2 flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-semibold text-xs flex items-center justify-center shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Operator'}</span>
              <span className="text-[11px] text-slate-600 truncate">{user?.email || 'user@turbine.ai'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400 hover:text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
