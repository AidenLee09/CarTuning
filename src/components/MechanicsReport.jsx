import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardList } from 'lucide-react';

function MechanicsReport({ report }) {
  return (
    <article className="glass-card flex h-[560px] flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Card C
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">The Mechanic's Report</h2>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-blue-300/25 bg-blue-500/10 text-blue-200">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="markdown-report min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/45 px-4 py-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>
    </article>
  );
}

export default MechanicsReport;
