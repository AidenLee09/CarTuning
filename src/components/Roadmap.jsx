import { AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react';

function Roadmap({ items, missingColumns }) {
  return (
    <article className="glass-card flex h-[560px] flex-col p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Card D
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">PM Roadmap</h2>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-red-300/25 bg-red-500/10 text-red-200">
          <PackageCheck className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={`${item.priority}-${item.part}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">{item.part}</p>
              <span className="rounded-md border border-blue-300/25 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-100">
                {item.priority}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.reason}</p>
          </div>
        ))}

        <div
          className={`rounded-lg border p-4 ${
            missingColumns.length
              ? 'border-red-300/25 bg-red-500/10'
              : 'border-emerald-300/25 bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {missingColumns.length ? (
              <AlertTriangle className="h-5 w-5 text-red-200" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-200" aria-hidden="true" />
            )}
            <p className="text-sm font-black text-white">
              {missingColumns.length ? 'Missing PIDs warning' : 'PID set validated'}
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {missingColumns.length
              ? `Add ${missingColumns.join(', ')} channels to improve the next report.`
              : 'Boost, Spark, IAT, AFR, and RPM were detected.'}
          </p>
        </div>
      </div>
    </article>
  );
}

export default Roadmap;
