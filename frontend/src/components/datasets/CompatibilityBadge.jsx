import React from 'react';
import { CheckCircle2, AlertTriangle, Play, Eye } from 'lucide-react';
import Button from '../common/Button';

export function CompatibilityBadge({
  compatibility,
  onRunAnalysis,
  onExplore,
  analyzing = false,
}) {
  if (!compatibility) return null;

  const isCompatible = compatibility.compatible;
  const farm = compatibility.farm;
  const missingFeatures = compatibility.missing_features || [];

  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-200 ${
        isCompatible
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/60 border-amber-200 text-amber-950'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          {isCompatible ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold">
                {isCompatible
                  ? `✓ Fully Compatible with Wind Farm ${farm || 'A'}`
                  : '⚠ Dataset Not Compatible for Direct ML Inference'}
              </h4>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isCompatible
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isCompatible ? 'Ready for AI Analysis' : 'Exploration Only'}
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-600 leading-relaxed">
              {compatibility.message ||
                (isCompatible
                  ? 'All expected power curve, vibration, and temperature telemetry features have been detected.'
                  : 'Required sensor feature columns are missing from this dataset. Explore statistics below.')}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          {isCompatible ? (
            <Button
              variant="primary"
              size="md"
              icon={Play}
              loading={analyzing}
              onClick={onRunAnalysis}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm"
            >
              Run AI Analysis
            </Button>
          ) : (
            <Button variant="outline" size="md" icon={Eye} onClick={onExplore}>
              Explore Dataset
            </Button>
          )}
        </div>
      </div>

      {!isCompatible && missingFeatures.length > 0 && (
        <div className="mt-4 pt-4 border-t border-amber-200/80">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            Missing SCADA Sensor Columns ({missingFeatures.length}):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {missingFeatures.map((feat) => (
              <span
                key={feat}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80 border border-amber-200 text-amber-900"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompatibilityBadge;
