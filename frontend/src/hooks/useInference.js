import { useState, useRef, useEffect, useCallback } from 'react';
import { inferenceService } from '../services/inferenceService';

export function useInference() {
  const [analysisId, setAnalysisId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollIntervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (id) => {
    try {
      const st = await inferenceService.getStatus(id);
      setStatus(st.status);
      setProgress(st.progress || 0);

      if (st.status === 'completed') {
        stopPolling();
        setLoading(false);
        const res = await inferenceService.getResults(id);
        setResults(res);
      } else if (st.status === 'failed') {
        stopPolling();
        setLoading(false);
        setError(st.error || 'Batch analysis failed on the server.');
      }
    } catch (err) {
      stopPolling();
      setLoading(false);
      setError(err.response?.data?.detail || err.message || 'Error polling analysis status.');
    }
  }, [stopPolling]);

  const startBatch = useCallback(async (datasetId, farm) => {
    stopPolling();
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setStatus('queued');

    try {
      const res = await inferenceService.startBatch(datasetId, farm);
      const newId = res.analysis_id;
      setAnalysisId(newId);

      // Initial check
      await pollStatus(newId);

      // Poll every 1.5s
      pollIntervalRef.current = setInterval(() => {
        pollStatus(newId);
      }, 1500);

      return newId;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.detail || err.message || 'Failed to start batch analysis.';
      setError(msg);
      throw err;
    }
  }, [pollStatus, stopPolling]);

  const monitorAnalysis = useCallback(async (existingId) => {
    if (!existingId) return;
    stopPolling();
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setStatus('queued');
    setAnalysisId(existingId);

    await pollStatus(existingId);

    pollIntervalRef.current = setInterval(() => {
      pollStatus(existingId);
    }, 1500);
  }, [pollStatus, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    analysisId,
    status,
    progress,
    results,
    loading,
    error,
    startBatch,
    monitorAnalysis,
    stopPolling,
  };
}
