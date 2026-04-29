import { useRef, useState } from 'react';
import { FileSpreadsheet, PlayCircle, UploadCloud } from 'lucide-react';

function DropZone({ disabled, onFileAccepted, onLoadMock }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = (file) => {
    if (file && !disabled) {
      onFileAccepted(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV telemetry file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
        className={`group grid min-h-[220px] place-items-center rounded-lg border border-dashed p-6 text-center transition duration-300 ${
          isDragging
            ? 'drop-zone-glow border-blue-300 bg-blue-500/12'
            : 'border-slate-500/60 bg-white/[0.03] hover:border-blue-300/80 hover:bg-blue-500/8'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        <div className="flex max-w-md flex-col items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-200 transition group-hover:scale-105">
            <UploadCloud className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-black text-white">Drop CSV Telemetry</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Boost, Spark, IAT, AFR, and RPM channels are mapped automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Select CSV
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onLoadMock}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 transition hover:border-red-300/50 hover:bg-red-500/10 hover:text-red-100 disabled:text-slate-500"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Load Mock Pull
        </button>
      </div>
    </div>
  );
}

export default DropZone;
