import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Fuel, Gauge, ShieldAlert, Thermometer, Zap } from 'lucide-react';
import WhatIfSimulator from './WhatIfSimulator.jsx';

const statusColor = (score) => {
  if (score >= 82) {
    return '#22c55e';
  }

  if (score >= 64) {
    return '#f59e0b';
  }

  return '#ef4444';
};

const vitals = [
  { key: 'thermal', label: 'Thermal', icon: Thermometer },
  { key: 'fueling', label: 'Fueling', icon: Fuel },
  { key: 'ignition', label: 'Ignition', icon: Zap },
];

const peakLabels = {
  boost: 'Boost',
  iat: 'IAT',
  afr: 'AFR',
};

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score ?? 0)));

const itemKey = (item, index) => `${item.priority ?? index}-${item.part}`;

function HealthGauge({ score }) {
  const color = statusColor(score);
  const angle = Math.max(0, Math.min(100, score)) * 3.6;

  return (
    <div className="grid place-items-center">
      <div
        className="relative grid h-44 w-44 place-items-center rounded-full shadow-2xl shadow-black/30"
        style={{
          background: `conic-gradient(${color} ${angle}deg, rgba(148, 163, 184, 0.16) ${angle}deg)`,
        }}
      >
        <div className="grid h-[132px] w-[132px] place-items-center rounded-full border border-white/10 bg-slate-950">
          <div className="text-center">
            <p className="text-5xl font-black text-white">{score}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Health
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalsMeter({ label, score, icon: Icon }) {
  const safeScore = Number.isFinite(score) ? score : 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-200" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-200">{label}</p>
        </div>
        <p className="text-sm font-black text-white">{safeScore}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, safeScore))}%`,
            background: statusColor(safeScore),
          }}
        />
      </div>
    </div>
  );
}

function AnalysisInsights({ analysis }) {
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    setSelectedKeys([]);
  }, [analysis]);

  const roadmap = analysis?.roadmap ?? [];
  const baseScores = {
    health: clampScore(analysis?.health_score),
    thermal: clampScore(analysis?.vitals?.thermal),
    fueling: clampScore(analysis?.vitals?.fueling),
    ignition: clampScore(analysis?.vitals?.ignition),
  };
  const projectedScores = useMemo(() => {
    const selectedItems = roadmap.filter((item, index) =>
      selectedKeys.includes(itemKey(item, index)),
    );

    return selectedItems.reduce(
      (scores, item) => ({
        health: clampScore(scores.health + (item.score_delta?.health ?? 0)),
        thermal: clampScore(scores.thermal + (item.score_delta?.thermal ?? 0)),
        fueling: clampScore(scores.fueling + (item.score_delta?.fueling ?? 0)),
        ignition: clampScore(scores.ignition + (item.score_delta?.ignition ?? 0)),
      }),
      baseScores,
    );
  }, [baseScores, roadmap, selectedKeys]);

  if (!analysis) {
    return null;
  }
  const isSimulating = selectedKeys.length > 0;
  const healthScore = projectedScores.health;
  const anomalies = analysis.anomalies ?? [];
  const trackPrep = analysis.track_prep ?? [];
  const peaks = analysis.sensor_peaks ?? {};
  const toggleWhatIf = (key) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  return (
    <article className="glass-card p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            AI Control Center
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Structured Race Intelligence</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">{analysis.lead_verdict}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <div className="rounded-lg border border-white/10 bg-slate-950/45 p-5">
          <HealthGauge score={healthScore} />
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-slate-300">
            {healthScore >= 82 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />
            )}
            {isSimulating ? 'Simulated Readiness Score' : 'Track Readiness Score'}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="grid gap-3">
            {vitals.map((vital) => (
              <VitalsMeter
                key={vital.key}
                icon={vital.icon}
                label={vital.label}
                score={projectedScores[vital.key]}
              />
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-200" aria-hidden="true" />
              <p className="text-sm font-black text-white">Sensor Peaks</p>
            </div>
            <div className="grid gap-3">
              {Object.entries(peakLabels).map(([key, label]) => {
                const peak = peaks[key] ?? {};

                return (
                  <div key={key} className="flex items-center justify-between border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{label}</p>
                      <p className="text-xs text-slate-500">Min {peak.min ?? '--'} {peak.unit ?? ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">
                        {peak.max ?? '--'} <span className="text-xs text-slate-400">{peak.unit ?? ''}</span>
                      </p>
                      <p className="text-xs text-slate-500">{peak.maxRpm ? `${peak.maxRpm} rpm` : 'sample'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-200" aria-hidden="true" />
              <p className="text-sm font-black text-white">Anomalies</p>
            </div>
            <div className="grid gap-3">
              {anomalies.slice(0, 3).map((anomaly) => (
                <div
                  key={`${anomaly.severity}-${anomaly.issue}`}
                  className={`rounded-lg border p-3 ${
                    anomaly.severity === 'critical'
                      ? 'border-red-300/25 bg-red-500/10'
                      : 'border-amber-300/25 bg-amber-500/10'
                  }`}
                >
                  <p className="text-sm font-black text-white">{anomaly.issue}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{anomaly.fix}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-blue-300/20 bg-blue-500/10 p-4">
        <p className="mb-3 text-sm font-black text-white">Track Prep</p>
        <div className="grid gap-2 md:grid-cols-5">
          {trackPrep.slice(0, 5).map((step, index) => (
            <div key={`${index}-${step}`} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm leading-5 text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <WhatIfSimulator
        roadmap={roadmap}
        selectedKeys={selectedKeys}
        base={baseScores}
        projected={projectedScores}
        getItemKey={itemKey}
        onReset={() => setSelectedKeys([])}
        onToggle={toggleWhatIf}
      />
    </article>
  );
}

export default AnalysisInsights;
