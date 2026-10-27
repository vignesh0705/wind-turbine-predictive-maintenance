import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Upload, Eye, FileText, ArrowUpDown } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import StatusBadge from '../components/common/StatusBadge';
import { useDatasets } from '../hooks/useDatasets';
import { formatDate, formatFileSize, formatNumber } from '../utils/formatters';

export function Datasets() {
  const navigate = useNavigate();
  const { datasets, loading, error, refetch } = useDatasets();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Datasets Management"
        subtitle="View and inspect uploaded SCADA sensor telemetry and historical datasets."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Datasets' },
        ]}
      >
        <Link to="/upload">
          <Button variant="primary" size="sm" icon={Upload}>
            Upload Dataset
          </Button>
        </Link>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No datasets uploaded yet"
          description="Upload your first SCADA or Kaggle tabular dataset to inspect features and evaluate machine learning models."
          actionLabel="Upload Dataset"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Dataset Name</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Rows</th>
                  <th className="py-3.5 px-4">Columns</th>
                  <th className="py-3.5 px-4">Compatibility</th>
                  <th className="py-3.5 px-4">Target Farm</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {datasets.map((dataset) => (
                  <tr key={dataset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate max-w-xs">{dataset.original_filename}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatFileSize(dataset.file_size)}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-mono font-medium">
                      {formatNumber(dataset.rows, 0)}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-mono font-medium">
                      {dataset.columns}
                    </td>
                    <td className="py-3 px-4">
                      {dataset.compatible ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center">
                          ✓ Compatible
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center">
                          Exploration Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {dataset.farm ? `Farm ${dataset.farm}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(dataset.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/datasets/${dataset.id}`}>
                        <Button variant="outline" size="sm" icon={Eye}>
                          Inspect
                        </Button>
                      </Link>
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

export default Datasets;
