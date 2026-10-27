import React, { useState, useEffect } from 'react';
import { Zap, Activity, RefreshCw } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import PowerCurveChart from '../components/dashboard/PowerCurveChart';
import SingleInferencePanel from '../components/performance/SingleInferencePanel';
import { dashboardService } from '../services/dashboardService';
import { formatNumber } from '../utils/formatters';

export function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await dashboardService.getSummary();
      setData(summary);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load performance metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  if (loading && !data) {
    return <Loading message="Loading power performance analysis..." />;
  }

  const actualPower = data?.actual_power || 0;
  const expectedPower = data?.expected_power || 0;
  const residual = actualPower - expectedPower;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="Power Performance Analysis"
        subtitle="Power generation curve tracking, theoretical vs actual generation, and real-time underperformance residual estimation."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Power Performance' },
        ]}
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchPerformance}>
          Refresh
        </Button>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={fetchPerformance} />}

      {/* KPI Cards: Actual Power, Expected Power, Residual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Measured Active Power
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
            {formatNumber(actualPower, 2)} <span className="text-xs font-normal text-slate-500">kW</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Fleet average generation</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Model Expected Power
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
            {formatNumber(expectedPower, 2)} <span className="text-xs font-normal text-slate-500">kW</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">XGBoost regression baseline</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Power Residual (Deviation)
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                residual >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {residual >= 0 ? 'Overperforming' : 'Underperforming'}
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
            {formatNumber(residual, 3)} <span className="text-xs font-normal text-slate-500">kW</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Actual minus expected output</span>
        </div>
      </div>

      {/* Main Chart */}
      <PowerCurveChart
        actualPower={actualPower}
        expectedPower={expectedPower}
        historyData={data?.power_history && data.power_history.length > 0 ? data.power_history : []}
        onDataRefresh={fetchPerformance}
      />

      {/* Manual Single Sample Edge Inference Tool */}
      <SingleInferencePanel />
    </div>
  );
}

export default Performance;
