import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { turbineService } from '../services/turbineService';
import { alertService } from '../services/alertService';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [turbines, setTurbines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, turbinesRes, alertsRes] = await Promise.allSettled([
        dashboardService.getSummary(),
        turbineService.getAll(),
        alertService.getAlerts({ limit: 5 }),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setData(summaryRes.value);
      } else {
        console.error('Error fetching dashboard summary:', summaryRes.reason);
      }

      if (turbinesRes.status === 'fulfilled') {
        setTurbines(turbinesRes.value || []);
      }

      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.items || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    turbines,
    alerts,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
