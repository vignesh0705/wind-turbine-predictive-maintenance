import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DatasetUploadCard from '../components/datasets/DatasetUploadCard';
import CompatibilityBadge from '../components/datasets/CompatibilityBadge';
import QualityIndicator from '../components/datasets/QualityIndicator';
import AnalysisProgress from '../components/inference/AnalysisProgress';
import AnalysisStatus from '../components/inference/AnalysisStatus';
import ErrorMessage from '../components/common/ErrorMessage';
import PowerCurveChart from '../components/dashboard/PowerCurveChart';
import { datasetService } from '../services/datasetService';
import { useInference } from '../hooks/useInference';
import { useToast } from '../context/ToastContext';

export function Upload() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [uploading, setUploading] = useState(false);
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [quality, setQuality] = useState(null);
  const [summary, setSummary] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Batch inference hook
  const {
    status: analysisStatus,
    progress: analysisProgress,
    results: analysisResults,
    loading: analyzing,
    error: analysisError,
    startBatch,
    monitorAnalysis,
  } = useInference();

  const handleUpload = async (file, onProgress) => {
    setUploading(true);
    setUploadError(null);
    setUploadedDataset(null);
    setCompatibility(null);
    setQuality(null);
    setSummary(null);

    try {
      // 1. Upload CSV
      const dataset = await datasetService.upload(file, onProgress);
      setUploadedDataset(dataset);
      showSuccess(`Dataset '${dataset.original_filename}' uploaded successfully!`);

      // 2. Fetch quality, summary, and compatibility in parallel
      const [compRes, qualRes, sumRes] = await Promise.all([
        datasetService.getCompatibility(dataset.id),
        datasetService.getQuality(dataset.id),
        datasetService.getSummary(dataset.id),
      ]);

      setCompatibility(compRes);
      setQuality(qualRes);
      setSummary(sumRes);

      // 3. If analysis was auto-queued, monitor it immediately
      if (dataset.analysis_id) {
        monitorAnalysis(dataset.analysis_id);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Dataset upload failed.';
      setUploadError(msg);
      showError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!uploadedDataset) return;
    try {
      const farmToRun = compatibility?.farm || uploadedDataset.farm || 'A';
      await startBatch(uploadedDataset.id, farmToRun);
      showSuccess('AI analysis queued successfully. Monitoring progress...');
    } catch (err) {
      // error handled by hook
    }
  };

  const handleExplore = () => {
    if (uploadedDataset) {
      navigate(`/datasets/${uploadedDataset.id}`);
    }
  };

  // Format prediction samples into time-series chart data
  const chartHistory = analysisResults?.sample_predictions?.map((p, idx) => {
    let tStr = `T+${idx}`;
    if (p.timestamp) {
      const s = String(p.timestamp);
      tStr = s.includes('T') ? s.split('T')[1].slice(0, 5) : (s.includes(' ') ? s.split(' ')[1].slice(0, 5) : s.slice(-5));
    }
    return {
      timestamp: tStr,
      actual_power: p.actual_power,
      expected_power: p.expected_power,
      residual: p.residual,
    };
  }) || [];

  const lastActual = chartHistory.length > 0 ? chartHistory[chartHistory.length - 1].actual_power : 0;
  const lastExpected = chartHistory.length > 0 ? chartHistory[chartHistory.length - 1].expected_power : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Dataset Ingestion & Analysis"
        subtitle="Upload wind turbine SCADA telemetry CSV files to verify sensor compatibility and execute predictive maintenance inference."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Upload Dataset' },
        ]}
      />

      {uploadError && <ErrorMessage message={uploadError} />}

      {/* Upload Card */}
      {!uploadedDataset && (
        <DatasetUploadCard onUpload={handleUpload} uploading={uploading} />
      )}

      {/* Uploaded Dataset Inspection Card */}
      {uploadedDataset && (
        <div className="space-y-6">
          {/* Compatibility Status & Action */}
          <CompatibilityBadge
            compatibility={compatibility}
            onRunAnalysis={handleRunAnalysis}
            onExplore={handleExplore}
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
              totalRows={uploadedDataset.rows}
            />
          )}

          {analysisError && <ErrorMessage message={analysisError} />}

          {/* Analysis Completed Results Banner & Power Performance Curve */}
          {analysisResults && (
            <div className="space-y-6">
              <AnalysisStatus
                results={analysisResults}
                onViewResults={() => navigate('/fleet')}
              />

              <PowerCurveChart
                actualPower={lastActual}
                expectedPower={lastExpected}
                historyData={chartHistory}
              />
            </div>
          )}

          {/* Data Quality & Summary */}
          {quality && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Dataset Telemetry Quality</h3>
              <QualityIndicator quality={quality} />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setUploadedDataset(null);
                setCompatibility(null);
                setQuality(null);
                setSummary(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              Upload another dataset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;
