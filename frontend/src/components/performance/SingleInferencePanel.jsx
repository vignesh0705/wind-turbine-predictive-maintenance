import React, { useState } from 'react';
import { Play, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { inferenceService } from '../../services/inferenceService';
import { formatNumber, formatHealth, formatRisk } from '../../utils/formatters';
import { COMPONENT_NAMES } from '../../lib/constants';

export function SingleInferencePanel() {
  const [farm, setFarm] = useState('A');
  const [assetId, setAssetId] = useState('WTG_01');
  const [actualPower, setActualPower] = useState('0.85');
  const [windSpeed, setWindSpeed] = useState('8.5');
  const [gearboxTemp, setGearboxTemp] = useState('65.2');
  const [generatorTemp, setGeneratorTemp] = useState('72.0');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRunInference = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Build features dictionary
    const features = {
      wind_speed_3_avg: Number(windSpeed) || 8.5,
      wind_speed_61_avg: Number(windSpeed) || 8.5,
      dt_gearbox_bearing: Number(gearboxTemp) || 65.2,
      dt_gen_bearing_de: Number(generatorTemp) || 72.0,
      sensor_5_avg: 12.4,
      sensor_18_avg: 15.1,
      tip_speed_ratio: 7.2,
      gear_ratio_dynamic: 104.2,
    };

    try {
      const res = await inferenceService.runSingle({
        farm,
        asset_id: assetId,
        timestamp: new Date().toISOString(),
        actual_power: Number(actualPower) || 0.85,
        features,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Single inference execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Edge Diagnostic Simulator</h3>
        <p className="text-xs text-slate-500 mt-1">
          Test real-time SCADA sensor inputs against the active XGBoost and Autoencoder models
        </p>
      </div>

      <form onSubmit={handleRunInference} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Wind Farm</label>
            <select
              value={farm}
              onChange={(e) => setFarm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="A">Wind Farm A</option>
              <option value="B">Wind Farm B</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Turbine Asset ID</label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Power (kW)</label>
            <input
              type="number"
              step="0.01"
              value={actualPower}
              onChange={(e) => setActualPower(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Wind Speed (m/s)</label>
            <input
              type="number"
              step="0.1"
              value={windSpeed}
              onChange={(e) => setWindSpeed(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gearbox Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              value={gearboxTemp}
              onChange={(e) => setGearboxTemp(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Generator Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              value={generatorTemp}
              onChange={(e) => setGeneratorTemp(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md" icon={Play} loading={loading}>
            Execute Edge Inference
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-900">Model Inference Results</span>
            </div>
            <StatusBadge status={result.risk_category} size="sm" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Expected Power</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {formatNumber(result.expected_power, 3)} kW
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Power Residual</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {formatNumber(result.residual, 3)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Health Index</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {formatHealth(result.health_index)} / 100
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Risk Priority</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {formatRisk(result.risk_score)}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
            <span>Dominant Component: <strong>{COMPONENT_NAMES[result.dominant_component] || result.dominant_component}</strong></span>
            <span>Anomaly Score: <strong>{formatNumber(result.anomaly_score, 4)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SingleInferencePanel;
