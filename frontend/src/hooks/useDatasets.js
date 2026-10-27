import { useState, useEffect, useCallback } from 'react';
import { datasetService } from '../services/datasetService';

export function useDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await datasetService.getAll();
      setDatasets(data || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return {
    datasets,
    loading,
    error,
    refetch: fetchDatasets,
  };
}
