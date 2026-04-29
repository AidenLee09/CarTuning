import { Activity, RadioTower } from 'lucide-react';
import apexMark from '../assets/apex-agent-mark.svg';

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img className="h-9 w-9" src={apexMark} alt="" />
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-white">
              Apex Agent
            </p>
            <p className="text-xs text-slate-500">Telemetry Analytics Suite</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 text-xs font-semibold text-blue-100">
            <RadioTower className="h-4 w-4" aria-hidden="true" />
            AI Engine: Gemini 2.5 Flash Active
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-red-300">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-100 sm:hidden">
          <RadioTower className="h-4 w-4" aria-label="AI Engine active" />
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl px-4 pb-3 sm:hidden">
        <div className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 text-[11px] font-semibold text-blue-100">
          <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
          AI Engine: Gemini 2.5 Flash Active
        </div>
      </div>
    </header>
  );
}

export default Header;
