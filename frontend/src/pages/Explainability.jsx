import React, { useState, useEffect } from 'react';
import { Sparkles, BarChart3, HelpCircle, RefreshCw, Layers } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import FeatureImportanceChart from '../components/explainability/FeatureImportanceChart';
import { explainabilityService } from '../services/explainabilityService';
import { formatNumber } from '../utils/formatters';

export function Explainability() {
  const [farm, setFarm] = useState('A');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplainability = async (selectedFarm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await explainabilityService.getGlobal(selectedFarm);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch model explainability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplainability(farm);
  }, [farm]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="Explainable AI & Feature Attribution"
        subtitle="Understand which sensor signals and environmental parameters influence the predictive machine learning models."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Explainability' },
        ]}
      >
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setFarm('A')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                farm === 'A' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Wind Farm A
            </button>
            <button
              onClick={() => setFarm('B')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                farm === 'B' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Wind Farm B
            </button>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fetchExplainability(farm)}>
            Refresh
          </Button>
        </div>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={() => fetchExplainability(farm)} />}

      {loading ? (
        <Loading message={`Extracting feature attributions for Wind Farm ${farm}...`} />
      ) : !data || !data.feature_importances || data.feature_importances.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
          Explainability data is not available for this analysis.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Global Attribution Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Global Feature Importance — {data.farm || `Farm ${farm}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{data.message}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start sm:self-center">
                Source: {data.feature_importance_source}
              </span>
            </div>

            <FeatureImportanceChart
              features={data.feature_importances}
              source={data.feature_importance_source}
            />
          </div>

          {/* Full Feature Importance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900">Complete Telemetry Feature Ranking</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Normalized relative contribution to power prediction and anomaly detection
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {data.feature_importances.length} Features
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Feature Name</th>
                    <th className="py-3 px-4">Relative Importance</th>
                    <th className="py-3 px-4 text-right">Contribution Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.feature_importances.map((item, idx) => {
                    const maxVal = data.feature_importances[0]?.importance || 1;
                    const pct = Math.min(100, Math.max(2, (item.importance / maxVal) * 100));

                    return (
                      <tr key={item.feature || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-400 font-mono w-16">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                          {item.feature}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {formatNumber(item.importance, 5)}
                        </td>
                        <td className="py-2.5 px-4 w-48 text-right">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div
                              className="bg-sky-600 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Explainability;
