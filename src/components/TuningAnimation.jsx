import { motion } from 'framer-motion';
import { Cpu, Gauge, Wrench } from 'lucide-react';

const bars = [54, 78, 42, 92, 66, 86, 48, 72, 58, 88, 62, 76];

function TuningAnimation() {
  return (
    <div className="glass-card relative flex h-full min-h-[520px] overflow-hidden">
      <motion.div
        className="absolute inset-x-0 top-0 h-1 bg-blue-400"
        animate={{ y: [0, 518, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              Tuning
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Reading mechanical logs</h2>
          </div>
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-12 w-12 place-items-center rounded-lg border border-red-300/30 bg-red-500/10 text-red-200"
          >
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </motion.div>
        </div>

        <div className="grid gap-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Boost Trace', Gauge],
              ['PID Mapper', Cpu],
              ['Race Notes', Wrench],
            ].map(([label, Icon]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <Icon className="h-4 w-4 text-blue-200" aria-hidden="true" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex h-52 items-end gap-2 rounded-lg border border-white/10 bg-slate-950/55 p-4">
            {bars.map((height, index) => (
              <motion.span
                key={`${height}-${index}`}
                className="block flex-1 rounded-t-md bg-blue-500"
                style={{ height: `${height}%` }}
                animate={{ opacity: [0.35, 1, 0.55], scaleY: [0.72, 1, 0.86] }}
                transition={{
                  duration: 1,
                  delay: index * 0.05,
                  repeat: Infinity,
                  repeatType: 'mirror',
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <motion.div
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-red-400 to-cyan-300"
          />
          <p>Normalizing boost, ignition, intake temperature, and AFR channels.</p>
        </div>
      </div>
    </div>
  );
}

export default TuningAnimation;
