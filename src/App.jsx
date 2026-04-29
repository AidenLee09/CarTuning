import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header.jsx';
import DropZone from './components/DropZone.jsx';
import TuningAnimation from './components/TuningAnimation.jsx';
import Notification from './components/Notification.jsx';
import { useTelemetryAnalysis } from './hooks/useTelemetryAnalysis.js';

const Dashboard = lazy(() => import('./components/Dashboard.jsx'));

function App() {
  const {
    status,
    telemetry,
    report,
    notification,
    analyzeFile,
    loadMockTelemetry,
    dismissNotification,
  } = useTelemetryAnalysis();

  const hasDashboard = status === 'complete' && telemetry;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0f172a] text-slate-100">
      <div className="track-grid" aria-hidden="true" />
      <Header />
      <Notification notification={notification} onDismiss={dismissNotification} />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-28 sm:px-6 sm:pt-24 lg:px-8">
        <section className="grid items-stretch gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-[520px] flex-col justify-between gap-6 rounded-lg border border-white/10 bg-slate-950/45 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7"
          >
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-md border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                Telemetry Intelligence
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  Race-engineering clarity from raw logs.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Upload a pull, surface thermal and timing risk, and turn the run into a
                  track-ready action plan.
                </p>
              </div>
            </div>

            <DropZone
              disabled={status === 'processing'}
              onFileAccepted={analyzeFile}
              onLoadMock={loadMockTelemetry}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
            className="min-h-[520px]"
          >
            {status === 'processing' ? (
              <TuningAnimation />
            ) : (
              <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Live Bay
                  </p>
                </div>
                <div className="grid flex-1 place-items-center p-5">
                  <div className="w-full max-w-md space-y-5">
                    <div className="telemetry-preview">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {['Boost', 'Spark', 'IAT'].map((label, index) => (
                        <div
                          key={label}
                          className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {label}
                          </p>
                          <p className="mt-2 text-2xl font-black text-white">
                            {hasDashboard
                              ? [
                                  `${telemetry.summary.maxBoost.value.toFixed(1)} psi`,
                                  `${telemetry.summary.timingAtMaxBoost.value.toFixed(1)} deg`,
                                  `${telemetry.summary.peakIat.value.toFixed(0)} F`,
                                ][index]
                              : '--'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </section>

        {hasDashboard ? (
          <Suspense fallback={null}>
            <Dashboard telemetry={telemetry} report={report} />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}

export default App;
