import { Flame, Gauge, Thermometer, Zap } from 'lucide-react';

const metrics = [
  {
    key: 'maxBoost',
    label: 'Max Boost',
    icon: Gauge,
    accent: 'text-blue-200',
    border: 'border-blue-300/25',
  },
  {
    key: 'peakIat',
    label: 'Peak IAT',
    icon: Thermometer,
    accent: 'text-red-200',
    border: 'border-red-300/25',
  },
  {
    key: 'timingAtMaxBoost',
    label: 'Ignition Timing',
    icon: Zap,
    accent: 'text-amber-200',
    border: 'border-amber-300/25',
  },
];

function SummaryCard({ summary, fileName }) {
  return (
    <article className="glass-card h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Card A
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Summary</h2>
          <p className="mt-1 text-sm text-slate-500">{fileName}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-red-300/25 bg-red-500/10 text-red-200">
          <Flame className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {metrics.map(({ key, label, icon: Icon, accent, border }) => {
          const metric = summary[key];

          return (
            <div
              key={key}
              className={`rounded-lg border ${border} bg-white/[0.04] p-4`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-300">{label}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {metric.rpm ? `${metric.rpm} rpm` : 'sample'}
                </p>
              </div>
              <p className="mt-4 text-4xl font-black text-white sm:text-5xl">
                {metric.value}
                <span className="ml-2 text-base font-bold text-slate-400">{metric.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default SummaryCard;
