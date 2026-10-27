import React from 'react';
import { Link } from 'react-router-dom';
import {
  Wind,
  ShieldCheck,
  Activity,
  Sparkles,
  Zap,
  ArrowRight,
  Database,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="h-20 border-b border-slate-100 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <Link to="/" className="flex items-center space-x-3">
          <img src="/logo.svg" alt="WindTurbine AI Logo" className="w-9 h-9" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              WindTurbine<span className="text-sky-600"> AI</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Industrial Monitoring
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="md">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 max-w-6xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold mb-6">
          <Wind className="w-3.5 h-3.5" />
          <span>Edge-Based Predictive Maintenance Framework</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-[1.15]">
          Smart Predictive Maintenance for <span className="text-sky-600">Wind Turbines</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
          Monitor turbine performance, detect anomalies, assess health, and prioritize maintenance
          using machine learning.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link to={isAuthenticated ? '/dashboard' : '/signup'}>
            <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right" className="shadow-lg shadow-sky-600/20 px-8">
              {isAuthenticated ? 'Open Dashboard' : 'Get Started Now'}
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="px-8">
              Sign In to Fleet
            </Button>
          </Link>
        </div>

        {/* Clean Industrial Graphic representation */}
        <div className="mt-16 w-full max-w-4xl p-6 sm:p-10 rounded-2xl bg-slate-50 border border-slate-200 shadow-card flex flex-col items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                01
              </div>
              <h4 className="font-semibold text-sm text-slate-900">SCADA Telemetry Ingestion</h4>
              <p className="text-xs text-slate-500">
                Automated parsing and compatibility verification of high-frequency SCADA sensor channels.
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                02
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Ensemble Edge Diagnostics</h4>
              <p className="text-xs text-slate-500">
                XGBoost power curve estimation fused with Deep Autoencoder and Isolation Forest anomaly models.
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                03
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Health Index & Risk Priority</h4>
              <p className="text-xs text-slate-500">
                Actionable component-level health scores (0-100) and operational maintenance ranking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-20 bg-slate-50 border-y border-slate-200 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Key AI Capabilities</h2>
            <p className="text-sm text-slate-500 mt-2">
              Engineered specifically for wind turbine operations, performance tracking, and component lifecycle preservation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Performance Monitoring</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Evaluates theoretical vs actual power generation curves via farm-calibrated XGBoost regression models.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Anomaly Detection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unsupervised neural Autoencoder reconstruction error fused with Isolation Forest density metrics.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Health & Risk Assessment</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Weighted fusion engine producing operational priority scores without confusing failure probabilities.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Explainable AI</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Global feature importances and local telemetry attribution to identify which sensors triggered priority alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-20 px-6 sm:px-12 max-w-5xl mx-auto text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-14 shadow-card space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            Ready to optimize your wind turbine fleet?
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            Sign up, upload your SCADA dataset, and get immediate operational diagnostics powered by verified ML models.
          </p>
          <div className="pt-2">
            <Link to="/signup">
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right" className="px-8 shadow-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-8 px-6 sm:px-12 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
          <span className="font-semibold text-slate-700">WindTurbine AI</span>
          <span>— Smart Predictive Maintenance Framework</span>
        </div>
        <div>
          <span>Production-grade SCADA edge inference</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
