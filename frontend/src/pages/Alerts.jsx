import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Filter, RefreshCw, Check } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { alertService } from '../services/alertService';
import { formatDateTime, formatRisk, formatNumber } from '../utils/formatters';
import { COMPONENT_NAMES } from '../lib/constants';
import { useToast } from '../context/ToastContext';

export function Alerts() {
  const { showSuccess, showError } = useToast();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState('ALL');
  const [turbineSearch, setTurbineSearch] = useState('');

  // Acknowledging state
  const [ackLoadingId, setAckLoadingId] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (acknowledgedFilter !== 'ALL') params.acknowledged = acknowledgedFilter === 'TRUE';
      if (turbineSearch.trim()) params.asset_id = turbineSearch.trim();

      const res = await alertService.getAlerts(params);
      setAlerts(res.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch operational alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, acknowledgedFilter]);

  const handleAcknowledge = async (id) => {
    setAckLoadingId(id);
    try {
      await alertService.acknowledge(id);
      showSuccess('Alert marked as acknowledged.');
      // Update locally
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to acknowledge alert.');
    } finally {
      setAckLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Anomaly & Diagnostic Alerts"
        subtitle="Operational priority notices generated from unsupervised neural Autoencoder and Isolation Forest anomaly thresholds."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Anomaly & Alerts' },
        ]}
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchAlerts}>
          Refresh
        </Button>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={fetchAlerts} />}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={acknowledgedFilter}
            onChange={(e) => setAcknowledgedFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Alerts</option>
            <option value="FALSE">Unacknowledged Only</option>
            <option value="TRUE">Acknowledged Only</option>
          </select>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchAlerts();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Turbine ID (e.g. WTG_01)..."
            value={turbineSearch}
            onChange={(e) => setTurbineSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No operational alerts found"
          description="There are currently no active alerts matching your filter criteria. All monitored parameters are within nominal operational tolerances."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Turbine</th>
                  <th className="py-3.5 px-4">Component Subsystem</th>
                  <th className="py-3.5 px-4">Operational Risk</th>
                  <th className="py-3.5 px-4">Anomaly Score</th>
                  <th className="py-3.5 px-4">Diagnostic Notice</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <StatusBadge status={alert.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <Link to={`/turbines/${alert.asset_id}`} className="hover:text-sky-600 transition-colors">
                        {alert.asset_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {COMPONENT_NAMES[alert.component] || alert.component || 'System'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatRisk(alert.risk_score)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatNumber(alert.anomaly_score, 3)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={alert.message}>
                      {alert.message}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDateTime(alert.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {alert.acknowledged ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Check className="w-3 h-3 mr-1 text-slate-400" />
                          Acknowledged
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={ackLoadingId === alert.id}
                          onClick={() => handleAcknowledge(alert.id)}
                          className="hover:border-slate-400"
                        >
                          Acknowledge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;
