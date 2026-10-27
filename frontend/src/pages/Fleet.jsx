import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind, Search, Filter, RefreshCw, Eye } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { turbineService } from '../services/turbineService';
import { formatHealth, formatRisk, formatDateTime } from '../utils/formatters';
import { COMPONENT_NAMES } from '../lib/constants';

export function Fleet() {
  const navigate = useNavigate();

  const [turbines, setTurbines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const fetchTurbines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await turbineService.getAll();
      setTurbines(data || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch turbines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurbines();
  }, []);

  // Filtered list
  const filteredTurbines = turbines.filter((t) => {
    const matchesSearch =
      t.turbine_id.toLowerCase().includes(search.toLowerCase()) ||
      (t.name && t.name.toLowerCase().includes(search.toLowerCase()));

    const matchesFarm =
      farmFilter === 'ALL' || (t.farm && t.farm.toUpperCase().includes(farmFilter));

    const matchesRisk =
      riskFilter === 'ALL' ||
      (t.latest_risk_category && t.latest_risk_category.toUpperCase() === riskFilter);

    return matchesSearch && matchesFarm && matchesRisk;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Fleet Monitoring"
        subtitle="Real-time operational status, health scores, and component degradation for active turbines."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Fleet Monitoring' },
        ]}
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchTurbines}>
          Refresh
        </Button>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={fetchTurbines} />}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search turbine ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Farm:</span>
          </div>
          <select
            value={farmFilter}
            onChange={(e) => setFarmFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Farms</option>
            <option value="A">Wind Farm A</option>
            <option value="B">Wind Farm B</option>
          </select>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500 ml-2">
            <span>Priority:</span>
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : filteredTurbines.length === 0 ? (
        <EmptyState
          icon={Wind}
          title="No turbines match your criteria"
          description="Try adjusting your search filters, or execute an analysis on an uploaded dataset."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Turbine</th>
                  <th className="py-3.5 px-4">Farm</th>
                  <th className="py-3.5 px-4">Health Index</th>
                  <th className="py-3.5 px-4">Operational Risk</th>
                  <th className="py-3.5 px-4">Maintenance Priority</th>
                  <th className="py-3.5 px-4">Dominant Degraded Component</th>
                  <th className="py-3.5 px-4">Last Evaluated</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTurbines.map((turbine) => (
                  <tr
                    key={turbine.id || turbine.turbine_id}
                    onClick={() => navigate(`/turbines/${turbine.turbine_id}`)}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {turbine.name || turbine.turbine_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{turbine.farm || '—'}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {formatHealth(turbine.latest_health)} / 100
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {formatRisk(turbine.latest_risk)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={turbine.latest_risk_category || 'LOW'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {COMPONENT_NAMES[turbine.dominant_component] || turbine.dominant_component || 'Nominal'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {formatDateTime(turbine.latest_prediction_timestamp)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="outline" size="sm" icon={Eye}>
                        Details
                      </Button>
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

export default Fleet;
