import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import Button from '../common/Button';
import { CHART_THEME } from '../../utils/chartHelpers';
import { datasetService } from '../../services/datasetService';

export function PowerCurveChart({
  actualPower = 0,
  expectedPower = 0,
  historyData = [],
  className = '',
  onDataRefresh = null,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const hasData = historyData && historyData.length > 0;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Uploading SCADA dataset...');
    try {
      const res = await datasetService.upload(file, (pct) => {
        setUploadStatus(`Uploading: ${pct}%...`);
      });

      setUploadStatus('Running AI power prediction & telemetry pipeline...');
      // Wait 3.5s for background ML batch processing to complete
      await new Promise((resolve) => setTimeout(resolve, 3500));

      if (onDataRefresh) {
        await onDataRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatKw = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '0.00 kW';
    if (Math.abs(num) < 0.1) return `${num.toFixed(3)} kW`;
    if (Math.abs(num) < 10) return `${num.toFixed(2)} kW`;
    return `${num.toFixed(1)} kW`;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-card flex flex-col justify-between ${className}`}>
      {/* Hidden file input for fast inline upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Power Performance Curve</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Actual Generation vs Model Expected Power Timeline
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-600 font-medium">Expected: {formatKw(expectedPower)}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-700" />
            <span className="text-slate-600 font-medium">Actual: {formatKw(actualPower)}</span>
          </div>

          <Button
            variant="ghost"
            size="xs"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-slate-500 hover:text-sky-600 border border-slate-200 rounded-lg px-2 py-1"
          >
            {uploading ? 'Processing...' : 'Upload File'}
          </Button>
        </div>
      </div>

      {uploading ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-sky-300 bg-sky-50/50 rounded-xl p-6 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm font-semibold text-sky-900">{uploadStatus}</p>
          <p className="text-xs text-sky-700 max-w-sm">
            Executing XGBoost regression baseline & PyTorch anomaly detection on uploaded telemetry.
          </p>
        </div>
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 mb-1">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-800">No analysis data available yet.</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Upload your SCADA dataset (.csv) here to immediately generate the real Power Performance Curve and telemetry output.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload SCADA Dataset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/upload')}
            >
              Full Ingestion Wizard
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={CHART_THEME.colors.text}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={CHART_THEME.colors.text}
                fontSize={11}
                tickLine={false}
                unit=" kW"
                tickFormatter={(val) => Math.abs(val) < 0.1 ? Number(val).toFixed(3) : (Math.abs(val) < 1 ? Number(val).toFixed(2) : Number(val).toFixed(1))}
              />
              <Tooltip
                contentStyle={CHART_THEME.tooltipStyle}
                formatter={(val, name) => [formatKw(val), name]}
              />
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
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default PowerCurveChart;
