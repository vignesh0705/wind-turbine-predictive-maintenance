import React, { useState, useEffect } from 'react';
import { HeartPulse, AlertTriangle, ShieldCheck, RefreshCw, Info } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import CircularGauge from '../components/health/CircularGauge';
import ComponentBreakdown from '../components/health/ComponentBreakdown';
import StatusBadge from '../components/common/StatusBadge';
import { dashboardService } from '../services/dashboardService';
import { turbineService } from '../services/turbineService';
import { formatHealth, formatRisk } from '../utils/formatters';
import { COMPONENT_NAMES } from '../lib/constants';

export function HealthRisk() {
  const [dashboardData, setDashboardData] = useState(null);
  const [turbines, setTurbines] = useState([]);
  const [selectedTurbineId, setSelectedTurbineId] = useState('');
  const [selectedTurbineData, setSelectedTurbineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, turbs] = await Promise.all([
        dashboardService.getSummary(),
        turbineService.getAll(),
      ]);
      setDashboardData(dash);
      setTurbines(turbs || []);
      if (turbs && turbs.length > 0 && !selectedTurbineId) {
        setSelectedTurbineId(turbs[0].turbine_id);
        setSelectedTurbineData(turbs[0]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load health and risk diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectTurbine = (turbId) => {
    setSelectedTurbineId(turbId);
    const found = turbines.find((t) => t.turbine_id === turbId);
    setSelectedTurbineData(found || null);
  };

  if (loading && !dashboardData) {
    return <Loading message="Loading health fusion and risk diagnostic models..." />;
  }

  // Active health and risk scores to display
  const activeHealth = selectedTurbineData
    ? selectedTurbineData.latest_health || 100
    : dashboardData?.average_health || 100;

  const activeRisk = selectedTurbineData
    ? selectedTurbineData.latest_risk || 0
    : dashboardData?.average_risk || 0;

  const activeCategory = selectedTurbineData
    ? selectedTurbineData.latest_risk_category || 'LOW'
    : activeRisk >= 75
    ? 'CRITICAL'
    : activeRisk >= 50
    ? 'HIGH'
    : activeRisk >= 25
    ? 'MEDIUM'
    : 'LOW';

  const activeDominant = selectedTurbineData?.dominant_component || 'gearbox';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="Health & Risk Fusion Engine"
        subtitle="Normalized multi-modal health diagnostics combining power degradation (35%), neural autoencoder anomalies (35%), and component sensor strain (30%)."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Health & Risk' },
        ]}
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchData}>
          Refresh
        </Button>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Turbine Selector Bar */}
      {turbines.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Select Specific Turbine for Diagnostic Breakdown:</span>
          </div>
          <select
            value={selectedTurbineId}
            onChange={(e) => handleSelectTurbine(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {turbines.map((t) => (
              <option key={t.id || t.turbine_id} value={t.turbine_id}>
                {t.name || t.turbine_id} ({t.farm || 'Fleet'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Top Gauges Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CircularGauge
          value={activeHealth}
          type="health"
          title="Health Index"
          subtitle="Composite diagnostic integrity score (0–100)"
        />

        <CircularGauge
          value={activeRisk}
          type="risk"
          title="Operational Risk Score"
          subtitle="Operational priority score, not failure probability."
        />

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Evaluation Context
            </span>
            <h4 className="text-xl font-bold text-slate-900 mt-1">
              {selectedTurbineData ? selectedTurbineData.name || selectedTurbineData.turbine_id : 'Fleet Wide Average'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedTurbineData?.farm || 'Ensemble fleet assessment'}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Maintenance Priority:</span>
              <StatusBadge status={activeCategory} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Dominant Degradation:</span>
              <span className="font-bold text-slate-800">
                {COMPONENT_NAMES[activeDominant] || activeDominant}
              </span>
            </div>
          </div>

          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-xs text-sky-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span className="leading-tight">
              Formula: Health Index = 100 × (1 − Raw Degradation). Risk Score = 100 − Health Index.
            </span>
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      <ComponentBreakdown
        dominantComponent={activeDominant}
        components={{
          gearbox: activeRisk * 0.9,
          generator: activeRisk * 0.75,
          hydraulic: activeRisk * 0.4,
          transformer: activeRisk * 0.25,
          electrical_grid: activeRisk * 0.15,
          rotor_mechanical: activeRisk * 0.6,
        }}
      />
    </div>
  );
}

export default HealthRisk;
