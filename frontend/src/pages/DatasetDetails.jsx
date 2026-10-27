import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Database, FileText, CheckCircle2, AlertTriangle, Play, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import CompatibilityBadge from '../components/datasets/CompatibilityBadge';
import QualityIndicator from '../components/datasets/QualityIndicator';
import AnalysisProgress from '../components/inference/AnalysisProgress';
import AnalysisStatus from '../components/inference/AnalysisStatus';
import { datasetService } from '../services/datasetService';
import { useInference } from '../hooks/useInference';
import { formatNumber, formatDate, formatFileSize } from '../utils/formatters';

export function DatasetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dataset, setDataset] = useState(null);
  const [summary, setSummary] = useState(null);
  const [quality, setQuality] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Column table pagination
  const [colPage, setColPage] = useState(1);
  const colPageSize = 10;

  const {
    status: analysisStatus,
    progress: analysisProgress,
    results: analysisResults,
    loading: analyzing,
    error: analysisError,
    startBatch,
  } = useInference();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [ds, sum, qual, comp] = await Promise.all([
          datasetService.getById(id),
          datasetService.getSummary(id),
          datasetService.getQuality(id),
          datasetService.getCompatibility(id),
        ]);
        setDataset(ds);
        setSummary(sum);
        setQuality(qual);
        setCompatibility(comp);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load dataset details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleRunAnalysis = async () => {
    if (!dataset) return;
    try {
      const targetFarm = compatibility?.farm || dataset.farm || 'A';
      await startBatch(dataset.id, targetFarm);
    } catch {
      // handled by hook
    }
  };

  if (loading) {
    return <Loading message="Loading dataset telemetry and summary..." />;
  }

  if (error || !dataset) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error || 'Dataset not found.'} />
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/datasets')}>
          Back to Datasets
        </Button>
      </div>
    );
  }

  // Paginated column stats
  const columnNames = summary?.column_names || [];
  const totalColPages = Math.ceil(columnNames.length / colPageSize) || 1;
  const currentCols = columnNames.slice((colPage - 1) * colPageSize, colPage * colPageSize);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title={dataset.original_filename}
        subtitle={`Dataset ID: ${dataset.id} • Uploaded on ${formatDate(dataset.created_at)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Datasets', href: '/datasets' },
          { label: dataset.original_filename },
        ]}
      >
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/datasets')}>
          Back to Datasets
        </Button>
      </PageHeader>

      {/* Compatibility Badge & AI trigger */}
      <CompatibilityBadge
        compatibility={compatibility}
        onRunAnalysis={handleRunAnalysis}
        onExplore={() => {}}
        analyzing={analyzing || analysisStatus === 'processing' || analysisStatus === 'queued'}
      />

      {/* Analysis Progress */}
      {(analysisStatus === 'queued' ||
        analysisStatus === 'processing' ||
        analysisStatus === 'completed' ||
        analysisStatus === 'failed') && (
        <AnalysisProgress
          status={analysisStatus}
          progress={analysisProgress}
          totalRows={dataset.rows}
        />
      )}

      {analysisError && <ErrorMessage message={analysisError} />}

      {analysisResults && (
        <AnalysisStatus results={analysisResults} onViewResults={() => navigate('/fleet')} />
      )}

      {/* Summary KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Records</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(dataset.rows, 0)}</p>
          <span className="text-xs text-slate-500 font-mono">SCADA samples</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Features / Columns</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dataset.columns}</p>
          <span className="text-xs text-slate-500 font-mono">{formatFileSize(dataset.file_size)}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Timestamp Column</span>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {summary?.detected_timestamp_col || 'Not detected'}
          </p>
          <span className="text-xs text-slate-500">Temporal axis</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Asset / Turbine ID</span>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {summary?.detected_asset_col || 'Not detected'}
          </p>
          <span className="text-xs text-slate-500">Unit identification</span>
        </div>
      </div>

      {/* Quality Indicator */}
      {quality && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Data Quality & Completeness</h3>
          <QualityIndicator quality={quality} />
        </div>
      )}

      {/* Columns & Statistics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Column Schema & Statistical Distributions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect sensor signal types, missing values, mean, and range
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Page {colPage} of {totalColPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Missing</th>
                <th className="py-3 px-4 font-mono">Mean</th>
                <th className="py-3 px-4 font-mono">Std</th>
                <th className="py-3 px-4 font-mono">Min</th>
                <th className="py-3 px-4 font-mono">Max</th>
                <th className="py-3 px-4 font-mono">Median</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentCols.map((colName) => {
                const dtype = summary?.dtypes?.[colName] || '—';
                const missing = summary?.missing_values?.[colName] || 0;
                const stats = summary?.numerical_statistics?.[colName] || {};

                return (
                  <tr key={colName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                      {colName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{dtype}</td>
                    <td className="py-3 px-4">
                      {missing > 0 ? (
                        <span className="text-amber-700 font-semibold">{missing}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stats.mean !== null && stats.mean !== undefined ? stats.mean : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stats.std !== null && stats.std !== undefined ? stats.std : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stats.min !== null && stats.min !== undefined ? stats.min : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stats.max !== null && stats.max !== undefined ? stats.max : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stats.median !== null && stats.median !== undefined ? stats.median : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalColPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/40">
            <button
              onClick={() => setColPage((p) => Math.max(1, p - 1))}
              disabled={colPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {colPage} of {totalColPages}
            </span>
            <button
              onClick={() => setColPage((p) => Math.min(totalColPages, p + 1))}
              disabled={colPage === totalColPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatasetDetails;
