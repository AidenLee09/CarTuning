import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const toneConfig = {
  error: {
    icon: XCircle,
    className: 'border-red-300/30 bg-red-500/15 text-red-100',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-300/30 bg-amber-500/15 text-amber-100',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100',
  },
  info: {
    icon: Info,
    className: 'border-blue-300/30 bg-blue-500/15 text-blue-100',
  },
};

function Notification({ notification, onDismiss }) {
  const config = notification ? toneConfig[notification.tone] ?? toneConfig.info : null;
  const Icon = config?.icon;

  return (
    <AnimatePresence>
      {notification ? (
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.24 }}
          className="fixed right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-md"
        >
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl ${config.className}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{notification.title}</p>
              <p className="mt-1 text-sm leading-6 opacity-90">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default Notification;
