import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wind, HeartPulse, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import StatusBadge from '../components/common/StatusBadge';
import CircularGauge from '../components/health/CircularGauge';
import ComponentBreakdown from '../components/health/ComponentBreakdown';
import PredictionTable from '../components/inference/PredictionTable';
import { turbineService } from '../services/turbineService';
import { formatHealth, formatRisk, formatDateTime } from '../utils/formatters';
import { CHART_THEME } from '../utils/chartHelpers';
import { COMPONENT_NAMES } from '../lib/constants';

export function TurbineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [turbine, setTurbine] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTurbine() {
      setLoading(true);
      setError(null);
      try {
        const [tData, hData] = await Promise.all([
          turbineService.getById(id),
          turbineService.getHistory(id, 100),
        ]);
        setTurbine(tData);
        setHistory(hData.history || []);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load turbine details.');
      } finally {
        setLoading(false);
      }
    }
    loadTurbine();
  }, [id]);

  if (loading) {
    return <Loading message={`Loading diagnostic data for Turbine ${id}...`} />;
  }

  if (error || !turbine) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error || 'Turbine not found.'} />
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/fleet')}>
          Back to Fleet
        </Button>
      </div>
    );
  }

  // Format chart time series
  const timelineData = [...history].reverse().map((h) => ({
    timestamp: formatDateTime(h.timestamp).split(',')[1]?.trim() || h.timestamp,
    actual_power: h.actual_power,
    expected_power: h.expected_power,
    health_index: h.health_index,
    risk_score: h.risk_score,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title={`Turbine ${turbine.turbine_id}`}
        subtitle={`Registered in ${turbine.farm} • Last evaluated: ${formatDateTime(turbine.latest_prediction_timestamp)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Fleet Monitoring', href: '/fleet' },
          { label: `Turbine ${turbine.turbine_id}` },
        ]}
      >
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/fleet')}>
          Back to Fleet
        </Button>
      </PageHeader>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CircularGauge
          value={turbine.latest_health || 100}
          type="health"
          title="Health Index"
          subtitle="Real-time composite telemetry integrity"
        />

        <CircularGauge
          value={turbine.latest_risk || 0}
          type="risk"
          title="Operational Risk Priority"
          subtitle="Operational priority score (not failure probability)"
        />

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Turbine Identity
              </span>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">{turbine.name || turbine.turbine_id}</h4>
              <p className="text-xs text-slate-500">{turbine.farm}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Maintenance Priority:</span>
                <StatusBadge status={turbine.latest_risk_category || 'LOW'} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dominant Degradation:</span>
                <span className="font-semibold text-slate-800">
                  {COMPONENT_NAMES[turbine.dominant_component] || turbine.dominant_component || 'Normal'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mt-4">
            Total historical time-series samples recorded: <strong>{history.length}</strong>
          </div>
        </div>
      </div>

      {/* Historical Power Generation Curve */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Actual vs Expected Power Generation Curve</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Model expectation (XGBoost) vs SCADA measured active power output
          </p>
        </div>

        {timelineData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No historical telemetry available for this turbine
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} />
                <XAxis dataKey="timestamp" stroke={CHART_THEME.colors.text} fontSize={11} tickLine={false} />
                <YAxis stroke={CHART_THEME.colors.text} fontSize={11} tickLine={false} unit=" kW" />
                <Tooltip contentStyle={CHART_THEME.tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="expected_power"
                  name="Expected Power"
                  stroke={CHART_THEME.colors.expected}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual_power"
                  name="Actual Power"
                  stroke={CHART_THEME.colors.actual}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Historical Health & Risk Trajectory */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Health & Operational Risk Trajectory</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Longitudinal degradation progression across historical measurement intervals
          </p>
        </div>

        {timelineData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No historical telemetry available
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} />
                <XAxis dataKey="timestamp" stroke={CHART_THEME.colors.text} fontSize={11} tickLine={false} />
                <YAxis stroke={CHART_THEME.colors.text} fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_THEME.tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="health_index"
                  name="Health Index"
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="risk_score"
                  name="Risk Priority"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Prediction History Records */}
      {history.length > 0 && (
        <PredictionTable predictions={history} title={`Telemetry History for ${turbine.turbine_id}`} />
      )}
    </div>
  );
}

export default TurbineDetails;
