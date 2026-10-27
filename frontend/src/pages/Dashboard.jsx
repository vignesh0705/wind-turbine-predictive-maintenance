import React from 'react';
import { Link } from 'react-router-dom';
import { Wind, HeartPulse, AlertTriangle, ShieldAlert, Upload, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import KpiCard from '../components/dashboard/KpiCard';
import RiskDistribution from '../components/dashboard/RiskDistribution';
import PowerCurveChart from '../components/dashboard/PowerCurveChart';
import RecentAlertsTable from '../components/dashboard/RecentAlertsTable';
import FleetSummaryTable from '../components/dashboard/FleetSummaryTable';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatHealth, formatRisk } from '../utils/formatters';

export function Dashboard() {
  const { user } = useAuth();
  const { data, turbines, alerts, loading, error, refetch } = useDashboard();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-96 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard className="lg:col-span-2 h-72" />
          <SkeletonCard className="h-72" />
        </div>
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <PageHeader
        // title={`Welcome back, ${user?.name || 'Operator'}`}
        title={`Turbine Performance Overview`}
        subtitle="Here is your wind turbine fleet overview and operational diagnostic telemetry."
      >
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={refetch}>
          Refresh
        </Button>
        <Link to="/upload">
          <Button variant="primary" size="sm" icon={Upload}>
            Upload Dataset
          </Button>
        </Link>
      </PageHeader>

      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KpiCard
          title="Total Turbines"
          value={data?.total_turbines || turbines?.length || 0}
          description="Operational units registered in fleet"
          icon={Wind}
          badgeText="Active Fleet"
          badgeColor="bg-sky-50 text-sky-700"
        />

        <KpiCard
          title="Average Health"
          value={`${formatHealth(data?.average_health || 100)} / 100`}
          description="Composite telemetry health index"
          icon={HeartPulse}
          badgeText={data?.average_health < 75 ? 'Caution' : 'Nominal'}
          badgeColor={data?.average_health < 75 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}
        />

        <KpiCard
          title="Average Risk"
          value={formatRisk(data?.average_risk || 0)}
          description="Operational maintenance priority score"
          icon={AlertTriangle}
          badgeText="Operational Risk"
          badgeColor="bg-slate-100 text-slate-700"
        />

        <KpiCard
          title="Active Alerts"
          value={data?.active_alerts || alerts?.length || 0}
          description="Unacknowledged elevated priority issues"
          icon={ShieldAlert}
          badgeText={data?.active_alerts > 0 ? 'Requires Action' : 'All Clear'}
          badgeColor={data?.active_alerts > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}
        />
      </div>

      {/* Charts Row: Power Curve + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PowerCurveChart
            actualPower={data?.actual_power || 0}
            expectedPower={data?.expected_power || 0}
            historyData={data?.power_history && data.power_history.length > 0 ? data.power_history : []}
            onDataRefresh={refetch}
          />
        </div>

        <div>
          <RiskDistribution
            lowCount={data?.low_count || 0}
            mediumCount={data?.medium_count || 0}
            highCount={data?.high_count || 0}
            criticalCount={data?.critical_count || 0}
          />
        </div>
      </div>

      {/* Tables Row: Fleet Overview + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FleetSummaryTable turbines={turbines} />
        <RecentAlertsTable alerts={alerts} />
      </div>
    </div>
  );
}

export default Dashboard;
