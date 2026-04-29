import { RotateCcw, Sparkles, Wrench } from 'lucide-react';

const deltaText = (value) => {
  if (!value) {
    return '+0';
  }

  return value > 0 ? `+${value}` : `${value}`;
};

function WhatIfSimulator({
  roadmap,
  selectedKeys,
  projected,
  base,
  onReset,
  onToggle,
  getItemKey,
}) {
  const selectedCount = selectedKeys.length;
  const totalDelta = projected.health - base.health;

  if (!roadmap.length) {
    return null;
  }

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-200" aria-hidden="true" />
            <p className="text-sm font-black text-white">What-If Simulator</p>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Toggle AI-recommended fixes to preview their projected impact before the next run.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-blue-300/20 bg-blue-500/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
              Projected Score
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {projected.health}
              <span className={`ml-2 text-sm ${totalDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {deltaText(totalDelta)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={!selectedCount}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 transition hover:border-red-300/40 hover:bg-red-500/10 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {roadmap.slice(0, 5).map((item, index) => {
          const key = getItemKey(item, index);
          const isSelected = selectedKeys.includes(key);
          const delta = item.score_delta ?? {};

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(key)}
              className={`rounded-lg border p-4 text-left transition ${
                isSelected
                  ? 'border-blue-300/60 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                  : 'border-white/10 bg-white/[0.04] hover:border-blue-300/35 hover:bg-blue-500/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Priority {item.priority ?? index + 1}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">{item.part}</p>
                </div>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                  isSelected
                    ? 'border-blue-300/40 bg-blue-500/20 text-blue-100'
                    : 'border-white/10 bg-slate-950/50 text-slate-400'
                }`}>
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">{item.impact}</p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  ['Health', delta.health],
                  ['Thermal', delta.thermal],
                  ['Fuel', delta.fueling],
                  ['Ign', delta.ignition],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-slate-950/40 px-2 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-emerald-300">{deltaText(value)}</p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WhatIfSimulator;
